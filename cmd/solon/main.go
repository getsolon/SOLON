package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/openclaw/solon/internal/gateway"
	"github.com/openclaw/solon/internal/guardrails"
	"github.com/openclaw/solon/internal/inference"
	"github.com/openclaw/solon/internal/models"
	"github.com/openclaw/solon/internal/storage"
	"github.com/openclaw/solon/internal/tunnel"
)

var version = "dev"

func main() {
	root := &cobra.Command{
		Use:   "solon",
		Short: "Self-hosted AI runtime with secure web API",
		Long:  "Solon — Your AI. Your rules.\n\nRun AI models locally and access them securely from the web via API keys.",
	}

	root.AddCommand(
		serveCmd(),
		modelsCmd(),
		keysCmd(),
		tunnelCmd(),
		statusCmd(),
		versionCmd(),
	)

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

func serveCmd() *cobra.Command {
	var port int
	var enableTunnel bool

	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the Solon daemon",
		RunE: func(cmd *cobra.Command, args []string) error {
			db, err := storage.Open("")
			if err != nil {
				return fmt.Errorf("opening database: %w", err)
			}
			defer func() { _ = db.Close() }()

			// Auto-create admin key on first run
			hasKeys, err := db.HasKeys()
			if err != nil {
				return fmt.Errorf("checking for keys: %w", err)
			}
			if !hasKeys {
				key, err := db.CreateKey("default-admin", "admin")
				if err != nil {
					return fmt.Errorf("creating initial admin key: %w", err)
				}
				fmt.Println()
				fmt.Println("  First run detected — admin API key created:")
				fmt.Println()
				fmt.Printf("  %s\n", key.Raw)
				fmt.Println()
				fmt.Println("  Save this key — it won't be shown again.")
				fmt.Println()
			}

			engine, err := inference.NewEngine()
			if err != nil {
				return fmt.Errorf("starting inference engine: %w", err)
			}
			defer func() { _ = engine.Close() }()

			t := tunnel.NewCloudflare(port)

			// Load guardrails config and policies
			grCfg := guardrails.LoadConfig(guardrails.ConfigPath())
			policies := guardrails.NewPolicyStore(guardrails.PoliciesDir())

			gw, err := gateway.New(gateway.Config{
				Port:       port,
				Version:    version,
				Engine:     engine,
				Store:      db,
				Tunnel:     t,
				Guardrails: grCfg,
				Policies:   policies,
			})
			if err != nil {
				return fmt.Errorf("creating gateway: %w", err)
			}

			fmt.Printf("Solon is running at http://localhost:%d\n", port)
			fmt.Printf("Dashboard: http://localhost:%d\n", port)

			if enableTunnel {
				fmt.Println("Starting tunnel...")
				if err := t.Enable(cmd.Context()); err != nil {
					fmt.Printf("Warning: tunnel failed to start: %v\n", err)
				} else {
					fmt.Printf("Tunnel: %s\n", t.URL())
				}
			}

			return gw.ListenAndServe()
		},
	}

	cmd.Flags().IntVarP(&port, "port", "p", 8420, "Port to listen on")
	cmd.Flags().BoolVar(&enableTunnel, "tunnel", false, "Enable Cloudflare tunnel on startup")
	return cmd
}

func modelsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "models",
		Short: "Manage AI models",
	}

	cmd.AddCommand(
		modelsPullCmd(),
		modelsListCmd(),
		modelsRemoveCmd(),
		modelsInfoCmd(),
		modelsAddCmd(),
		modelsKnownCmd(),
	)

	return cmd
}

func modelsPullCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "pull [model]",
		Short: "Download a model",
		Long:  "Download a model by name (e.g., 'llama3.2:3b') or direct HuggingFace reference (e.g., 'bartowski/Llama-3.2-3B-Instruct-GGUF').",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]

			engine, err := inference.NewEngine()
			if err != nil {
				return fmt.Errorf("starting engine: %w", err)
			}
			defer func() { _ = engine.Close() }()

			fmt.Printf("Pulling model %s...\n", name)

			progressFn := func(p models.DownloadProgress) {
				switch p.Event {
				case "start":
					fmt.Printf("  Downloading: %s\n", p.File)
				case "progress":
					fmt.Printf("\r  %.1f%% (%d / %d MB)",
						p.Percent,
						p.Downloaded/(1024*1024),
						p.Total/(1024*1024))
				case "done":
					fmt.Printf("\r  Download complete!                    \n")
				case "error":
					fmt.Printf("\n  Error: %s\n", p.Message)
				}
			}

			if err := engine.PullModel(cmd.Context(), name, progressFn); err != nil {
				return err
			}

			fmt.Printf("Model %s pulled successfully.\n", name)
			return nil
		},
	}
}

func modelsListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List installed models",
		RunE: func(cmd *cobra.Command, args []string) error {
			engine, err := inference.NewEngine()
			if err != nil {
				return fmt.Errorf("starting engine: %w", err)
			}
			defer func() { _ = engine.Close() }()

			models, err := engine.ListModels(cmd.Context())
			if err != nil {
				return err
			}

			if len(models) == 0 {
				fmt.Println("No models installed. Run 'solon models pull <model>' to get started.")
				fmt.Println()
				fmt.Println("Available models:")
				fmt.Println("  llama3.2:3b    — Llama 3.2 3B (2 GB)")
				fmt.Println("  llama3.2:8b    — Llama 3.2 8B (5 GB)")
				fmt.Println("  mistral:7b     — Mistral 7B (4 GB)")
				fmt.Println("  phi4:14b       — Phi-4 14B (8 GB)")
				fmt.Println("  qwen2.5:7b     — Qwen 2.5 7B (4 GB)")
				return nil
			}

			fmt.Printf("%-30s %-10s %-15s\n", "NAME", "SIZE", "MODIFIED")
			for _, m := range models {
				fmt.Printf("%-30s %-10s %-15s\n", m.Name, m.SizeHuman(), m.ModifiedHuman())
			}
			return nil
		},
	}
}

func modelsRemoveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "remove [model]",
		Short: "Remove a model",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			engine, err := inference.NewEngine()
			if err != nil {
				return fmt.Errorf("starting engine: %w", err)
			}
			defer func() { _ = engine.Close() }()

			fmt.Printf("Removing model %s...\n", args[0])
			if err := engine.RemoveModel(cmd.Context(), args[0]); err != nil {
				return err
			}

			fmt.Printf("Model %s removed.\n", args[0])
			return nil
		},
	}
}

func modelsInfoCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "info [model]",
		Short: "Show detailed information about an installed model",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			engine, err := inference.NewEngine()
			if err != nil {
				return fmt.Errorf("starting engine: %w", err)
			}
			defer func() { _ = engine.Close() }()

			info, err := engine.GetModelInfo(cmd.Context(), args[0])
			if err != nil {
				return err
			}

			fmt.Printf("Name:         %s\n", info.Name)
			fmt.Printf("Size:         %s\n", info.SizeHuman())
			if info.Format != "" {
				fmt.Printf("Format:       %s\n", info.Format)
			}
			if info.Family != "" {
				fmt.Printf("Family:       %s\n", info.Family)
			}
			if info.Params != "" {
				fmt.Printf("Parameters:   %s\n", info.Params)
			}
			if info.Quantization != "" {
				fmt.Printf("Quantization: %s\n", info.Quantization)
			}
			fmt.Printf("Modified:     %s\n", info.ModifiedHuman())
			return nil
		},
	}
}

func modelsAddCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "add [name] [hf-repo] [quantization]",
		Short: "Add a custom model name mapping",
		Long:  "Map a friendly name to a HuggingFace repo. Quantization defaults to Q4_K_M.",
		Args:  cobra.RangeArgs(2, 3),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			repo := args[1]
			quant := "Q4_K_M"
			if len(args) == 3 {
				quant = args[2]
			}

			dataDir, err := models.DataDir()
			if err != nil {
				return fmt.Errorf("getting data dir: %w", err)
			}

			reg, err := models.NewRegistry(dataDir)
			if err != nil {
				return fmt.Errorf("initializing registry: %w", err)
			}

			if err := reg.AddCustomMapping(name, models.ModelSource{
				Repo: repo,
				File: quant,
			}); err != nil {
				return fmt.Errorf("adding mapping: %w", err)
			}

			fmt.Printf("Added mapping: %s → %s (filter: %s)\n", name, repo, quant)
			return nil
		},
	}
}

func modelsKnownCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "known",
		Short: "List known model names and their HuggingFace sources",
		RunE: func(cmd *cobra.Command, args []string) error {
			dataDir, err := models.DataDir()
			if err != nil {
				return fmt.Errorf("getting data dir: %w", err)
			}

			reg, err := models.NewRegistry(dataDir)
			if err != nil {
				return fmt.Errorf("initializing registry: %w", err)
			}

			known := reg.KnownModels()
			fmt.Printf("%-20s %-50s %-10s\n", "NAME", "REPO", "QUANT")
			for name, source := range known {
				fmt.Printf("%-20s %-50s %-10s\n", name, source.Repo, source.File)
			}
			return nil
		},
	}
}

func keysCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "keys",
		Short: "Manage API keys",
	}

	var keyName string
	var keyScope string

	createCmd := &cobra.Command{
		Use:   "create",
		Short: "Create a new API key",
		RunE: func(cmd *cobra.Command, args []string) error {
			if keyScope != "admin" && keyScope != "user" {
				return fmt.Errorf("invalid scope %q: must be 'admin' or 'user'", keyScope)
			}

			db, err := storage.Open("")
			if err != nil {
				return fmt.Errorf("opening database: %w", err)
			}
			defer func() { _ = db.Close() }()

			key, err := db.CreateKey(keyName, keyScope)
			if err != nil {
				return fmt.Errorf("creating key: %w", err)
			}

			fmt.Println("API key created successfully!")
			fmt.Println()
			fmt.Printf("  Key:   %s\n", key.Raw)
			fmt.Printf("  Name:  %s\n", key.Name)
			fmt.Printf("  Scope: %s\n", key.Scope)
			fmt.Println()
			fmt.Println("Save this key — it won't be shown again.")
			return nil
		},
	}
	createCmd.Flags().StringVar(&keyName, "name", "", "Name for the API key")
	createCmd.Flags().StringVar(&keyScope, "scope", "user", "Key scope: 'admin' or 'user'")
	_ = createCmd.MarkFlagRequired("name")

	cmd.AddCommand(
		createCmd,
		&cobra.Command{
			Use:   "list",
			Short: "List all API keys",
			RunE: func(cmd *cobra.Command, args []string) error {
				db, err := storage.Open("")
				if err != nil {
					return fmt.Errorf("opening database: %w", err)
				}
				defer func() { _ = db.Close() }()

				keys, err := db.ListKeys()
				if err != nil {
					return err
				}

				if len(keys) == 0 {
					fmt.Println("No API keys. Run 'solon keys create --name <name>' to create one.")
					return nil
				}

				fmt.Printf("%-20s %-15s %-10s %-20s\n", "NAME", "PREFIX", "SCOPE", "CREATED")
				for _, k := range keys {
					fmt.Printf("%-20s %-15s %-10s %-20s\n", k.Name, k.Prefix+"...", k.Scope, k.CreatedAt.Format("2006-01-02 15:04"))
				}
				return nil
			},
		},
		&cobra.Command{
			Use:   "revoke [key]",
			Short: "Revoke an API key",
			Args:  cobra.ExactArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				db, err := storage.Open("")
				if err != nil {
					return fmt.Errorf("opening database: %w", err)
				}
				defer func() { _ = db.Close() }()

				if err := db.RevokeKey(args[0]); err != nil {
					return fmt.Errorf("revoking key: %w", err)
				}

				fmt.Println("API key revoked.")
				return nil
			},
		},
	)

	return cmd
}

func tunnelCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "tunnel",
		Short: "Manage secure tunnel",
	}

	cmd.AddCommand(
		&cobra.Command{
			Use:   "enable",
			Short: "Enable secure tunnel to expose API to the internet",
			RunE: func(cmd *cobra.Command, args []string) error {
				t := tunnel.NewCloudflare(8420)
				if err := t.Enable(cmd.Context()); err != nil {
					return fmt.Errorf("enabling tunnel: %w", err)
				}
				fmt.Printf("Tunnel enabled: %s\n", t.URL())
				return nil
			},
		},
		&cobra.Command{
			Use:   "disable",
			Short: "Disable secure tunnel",
			RunE: func(cmd *cobra.Command, args []string) error {
				t := tunnel.NewCloudflare(8420)
				return t.Disable(cmd.Context())
			},
		},
		&cobra.Command{
			Use:   "status",
			Short: "Show tunnel status",
			RunE: func(cmd *cobra.Command, args []string) error {
				t := tunnel.NewCloudflare(8420)
				status, err := t.Status(cmd.Context())
				if err != nil {
					return err
				}
				if status.Enabled {
					fmt.Printf("Tunnel: enabled\n")
					fmt.Printf("URL:    %s\n", status.URL)
				} else {
					fmt.Println("Tunnel: disabled")
				}
				return nil
			},
		},
	)

	return cmd
}

func statusCmd() *cobra.Command {
	var port int

	cmd := &cobra.Command{
		Use:   "status",
		Short: "Show Solon daemon status",
		RunE: func(cmd *cobra.Command, args []string) error {
			url := fmt.Sprintf("http://localhost:%d/api/v1/health", port)

			client := &http.Client{Timeout: 2 * time.Second}
			resp, err := client.Get(url)
			if err != nil {
				fmt.Println("Status:  stopped")
				fmt.Printf("Port:    %d\n", port)
				return nil
			}
			defer func() { _ = resp.Body.Close() }()

			var health struct {
				Status  string `json:"status"`
				Version string `json:"version"`
			}
			_ = json.NewDecoder(resp.Body).Decode(&health)

			fmt.Println("Status:  running")
			fmt.Printf("Port:    %d\n", port)
			fmt.Printf("Version: %s\n", health.Version)
			fmt.Printf("URL:     http://localhost:%d\n", port)
			return nil
		},
	}

	cmd.Flags().IntVarP(&port, "port", "p", 8420, "Port to check")
	return cmd
}

func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show Solon version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("solon version %s\n", version)
		},
	}
}
