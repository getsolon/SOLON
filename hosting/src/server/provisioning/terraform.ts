import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TERRAFORM_BIN = process.env.TERRAFORM_BIN || "terraform";

interface TerraformExecResult {
  stdout: string;
  stderr: string;
}

async function runTerraform(
  args: string[],
  cwd: string
): Promise<TerraformExecResult> {
  try {
    const result = await execFileAsync(TERRAFORM_BIN, args, {
      cwd,
      timeout: 300_000, // 5 minute timeout
      env: {
        ...process.env,
        TF_IN_AUTOMATION: "1",
        TF_INPUT: "0",
      },
    });
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(
      `Terraform ${args[0]} failed: ${execError.stderr || execError.message}`
    );
  }
}

/**
 * Initialize a Terraform workspace directory.
 */
export async function terraformInit(workspaceDir: string): Promise<void> {
  await runTerraform(["init", "-no-color"], workspaceDir);
}

/**
 * Apply the Terraform configuration in the workspace directory.
 */
export async function terraformApply(workspaceDir: string): Promise<void> {
  await runTerraform(
    ["apply", "-auto-approve", "-no-color"],
    workspaceDir
  );
}

/**
 * Get Terraform outputs as a parsed JSON object.
 */
export async function terraformOutput(
  workspaceDir: string
): Promise<Record<string, { value: string }>> {
  const result = await runTerraform(
    ["output", "-json", "-no-color"],
    workspaceDir
  );
  return JSON.parse(result.stdout);
}

/**
 * Destroy all resources managed by the Terraform configuration.
 */
export async function terraformDestroy(workspaceDir: string): Promise<void> {
  await runTerraform(
    ["destroy", "-auto-approve", "-no-color"],
    workspaceDir
  );
}
