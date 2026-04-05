#!/usr/bin/env python3
"""Download a GGUF model from HuggingFace and upload to Solon's R2 mirror."""

import os
import sys
import subprocess
import time
import functools
import boto3

# Unbuffered print for piped output
print = functools.partial(print, flush=True)

R2_ENDPOINT = "https://e8ac4eb5225e608e3a5a10015cce94fa.eu.r2.cloudflarestorage.com"
R2_BUCKET = "solon-models"

MODELS = {
    # --- Already mirrored (for reference / re-upload) ---
    # "llama3.2-3b-Q4_K_M.gguf": {"repo": "bartowski/Llama-3.2-3B-Instruct-GGUF", "hf_file": "Llama-3.2-3B-Instruct-Q4_K_M.gguf"},
    # "llama3.1-8b-Q4_K_M.gguf": {"repo": "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF", "hf_file": "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"},
    # "gemma3-4b-Q4_K_M.gguf": {"repo": "bartowski/google_gemma-3-4b-it-GGUF", "hf_file": "google_gemma-3-4b-it-Q4_K_M.gguf"},
    # "qwen2.5-7b-Q4_K_M.gguf": {"repo": "Qwen/Qwen2.5-7B-Instruct-GGUF", "hf_file": "qwen2.5-7b-instruct-q4_k_m.gguf"},
    # "mistral-7b-Q4_K_M.gguf": {"repo": "bartowski/Mistral-7B-Instruct-v0.3-GGUF", "hf_file": "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf"},
    # "phi4-mini-Q4_K_M.gguf": {"repo": "bartowski/microsoft_Phi-4-mini-instruct-GGUF", "hf_file": "microsoft_Phi-4-mini-instruct-Q4_K_M.gguf"},
    # "deepseek-r1-14b-Q4_K_M.gguf": {"repo": "bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF", "hf_file": "DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf"},
    # "mixtral-8x7b-Q4_K_M.gguf": {"repo": "bartowski/Mixtral-8x7B-Instruct-v0.1-GGUF", "hf_file": "Mixtral-8x7B-Instruct-v0.1-Q4_K_M.gguf"},
    # "llama3.1-70b-Q4_K_M.gguf": {"repo": "bartowski/Meta-Llama-3.1-70B-Instruct-GGUF", "hf_file": "Meta-Llama-3.1-70B-Instruct-Q4_K_M.gguf"},

    # --- Priority 1: Small popular models (< 5 GB) ---
    "qwen2.5-1.5b-Q4_K_M.gguf": {"repo": "Qwen/Qwen2.5-1.5B-Instruct-GGUF", "hf_file": "qwen2.5-1.5b-instruct-q4_k_m.gguf"},
    "deepseek-r1-1.5b-Q4_K_M.gguf": {"repo": "bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF", "hf_file": "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf"},
    "nomic-embed-text-137m.gguf": {"repo": "nomic-ai/nomic-embed-text-v1.5-GGUF", "hf_file": "nomic-embed-text-v1.5.Q8_0.gguf"},
    "mxbai-embed-large-335m.gguf": {"repo": "mixedbread-ai/mxbai-embed-large-v1", "hf_file": "gguf/mxbai-embed-large-v1-f16.gguf"},
    "starcoder2-3b-Q4_K_M.gguf": {"repo": "QuantFactory/starcoder2-3b-GGUF", "hf_file": "starcoder2-3b.Q4_K_M.gguf"},
    "codellama-7b-Q4_K_M.gguf": {"repo": "TheBloke/CodeLlama-7B-Instruct-GGUF", "hf_file": "codellama-7b-instruct.Q4_K_M.gguf"},
    "command-r-7b-Q4_K_M.gguf": {"repo": "bartowski/c4ai-command-r7b-12-2024-GGUF", "hf_file": "c4ai-command-r7b-12-2024-Q4_K_M.gguf"},
    "deepseek-r1-7b-Q4_K_M.gguf": {"repo": "bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF", "hf_file": "DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf"},

    # --- Priority 2: Medium models (5-15 GB) ---
    "gemma3-12b-Q4_K_M.gguf": {"repo": "lmstudio-community/gemma-3-12b-it-GGUF", "hf_file": "gemma-3-12b-it-Q4_K_M.gguf"},
    "qwen2.5-14b-Q4_K_M.gguf": {"repo": "bartowski/Qwen2.5-14B-Instruct-GGUF", "hf_file": "Qwen2.5-14B-Instruct-Q4_K_M.gguf"},
    "phi4-14b-Q4_K_M.gguf": {"repo": "QuantFactory/phi-4-GGUF", "hf_file": "phi-4.Q4_K_M.gguf"},
    "codellama-13b-Q4_K_M.gguf": {"repo": "TheBloke/CodeLlama-13B-Instruct-GGUF", "hf_file": "codellama-13b-instruct.Q4_K_M.gguf"},
    "starcoder2-7b-Q4_K_M.gguf": {"repo": "QuantFactory/starcoder2-7b-GGUF", "hf_file": "starcoder2-7b.Q4_K_M.gguf"},
    "starcoder2-15b-Q4_K_M.gguf": {"repo": "QuantFactory/starcoder2-15b-GGUF", "hf_file": "starcoder2-15b.Q4_K_M.gguf"},

    # --- Priority 3: Large models (15+ GB) ---
    "gemma3-27b-Q4_K_M.gguf": {"repo": "lmstudio-community/gemma-3-27b-it-GGUF", "hf_file": "gemma-3-27b-it-Q4_K_M.gguf"},
    "qwen2.5-32b-Q4_K_M.gguf": {"repo": "bartowski/Qwen2.5-32B-Instruct-GGUF", "hf_file": "Qwen2.5-32B-Instruct-Q4_K_M.gguf"},
    "deepseek-r1-32b-Q4_K_M.gguf": {"repo": "bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF", "hf_file": "DeepSeek-R1-Distill-Qwen-32B-Q4_K_M.gguf"},
    "command-r-35b-Q4_K_M.gguf": {"repo": "bartowski/c4ai-command-r-v01-GGUF", "hf_file": "c4ai-command-r-v01-Q4_K_M.gguf"},
    "codellama-34b-Q4_K_M.gguf": {"repo": "TheBloke/CodeLlama-34B-Instruct-GGUF", "hf_file": "codellama-34b-instruct.Q4_K_M.gguf"},
    "deepseek-r1-70b-Q4_K_M.gguf": {"repo": "bartowski/DeepSeek-R1-Distill-Llama-70B-GGUF", "hf_file": "DeepSeek-R1-Distill-Llama-70B-Q4_K_M.gguf"},
}

def get_s3_client():
    key_id = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    if not key_id or not secret:
        print("Error: Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY")
        sys.exit(1)
    return boto3.client("s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        region_name="auto",
    )

def upload_file(s3, local_path, r2_key, max_retries=10):
    size = os.path.getsize(local_path)
    print(f"Uploading {r2_key} ({size / 1e9:.1f} GB)...")
    # Use smaller chunks for more resilient multipart uploads
    chunk_size = 64 * 1024 * 1024  # 64 MB chunks (smaller = less wasted on failure)
    config = boto3.s3.transfer.TransferConfig(
        multipart_threshold=64 * 1024 * 1024,
        multipart_chunksize=chunk_size,
        max_concurrency=2,  # Reduce concurrent parts to avoid overwhelming connection
    )
    for attempt in range(1, max_retries + 1):
        try:
            s3.upload_file(local_path, R2_BUCKET, r2_key,
                Callback=lambda bytes_transferred: None,
                Config=config,
            )
            # Verify the upload size matches
            head = s3.head_object(Bucket=R2_BUCKET, Key=r2_key)
            remote_size = head['ContentLength']
            if remote_size != size:
                print(f"WARNING: Size mismatch! Local={size}, Remote={remote_size}. Retrying...")
                s3.delete_object(Bucket=R2_BUCKET, Key=r2_key)
                raise Exception(f"Size mismatch: {remote_size} != {size}")
            print(f"Done: https://pub-ceabcf6fa0bd445f944e5343aab8cd05.r2.dev/{r2_key}")
            return
        except Exception as e:
            wait = min(30 * attempt, 180)  # 30s, 60s, 90s, ... up to 180s
            print(f"Upload attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                print(f"Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"FAILED after {max_retries} attempts: {r2_key}")
                raise

def download_from_hf(repo, filename, output_dir):
    """Download a specific file from HuggingFace using curl with resume support."""
    url = f"https://huggingface.co/{repo}/resolve/main/{filename}"
    output_path = os.path.join(output_dir, os.path.basename(filename))
    # Remove tiny error pages from previous failed attempts
    if os.path.exists(output_path) and os.path.getsize(output_path) <= 1000:
        os.remove(output_path)
    # Always run curl with -C - (resume). It will:
    # - Skip if the file is already complete (same size as Content-Length)
    # - Resume from where it left off if the file is partial
    # - Download from scratch if no file exists
    print(f"Downloading {url}...")
    cmd = ["curl", "-L", "-o", output_path, "--progress-bar", "-f", "--retry", "5", "--retry-delay", "3", "-C", "-", url]
    hf_token = os.environ.get("HF_TOKEN")
    if hf_token:
        cmd[1:1] = ["-H", f"Authorization: Bearer {hf_token}"]
    subprocess.run(cmd, check=True)
    return output_path

def list_models():
    """List all models and their mirror status."""
    print(f"{'R2 KEY':<45} {'HF REPO':<55} {'STATUS'}")
    print("-" * 110)
    for r2_key, info in MODELS.items():
        print(f"{r2_key:<45} {info['repo']:<55} pending")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        list_models()
        sys.exit(0)

    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Usage: upload-model-r2.py [model-key | --list | --all]")
        print("  --list    List all models to upload")
        print("  --all     Upload all models (warning: very large)")
        print("  <key>     Upload specific model by R2 key name")
        sys.exit(0)

    s3 = get_s3_client()
    tmp_dir = "/tmp/solon-models"
    os.makedirs(tmp_dir, exist_ok=True)

    upload_all = len(sys.argv) > 1 and sys.argv[1] == "--all"
    target = sys.argv[1] if len(sys.argv) > 1 and not upload_all else None

    for r2_key, info in MODELS.items():
        if target and target != r2_key:
            continue
        if not upload_all and not target:
            print("Specify a model key, --all, or --list. Use --help for usage.")
            sys.exit(1)
        local_path = download_from_hf(info["repo"], info["hf_file"], tmp_dir)
        upload_file(s3, local_path, r2_key)
