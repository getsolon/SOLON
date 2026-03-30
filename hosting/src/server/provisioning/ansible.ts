import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const ANSIBLE_PLAYBOOK_BIN =
  process.env.ANSIBLE_PLAYBOOK_BIN || "ansible-playbook";

// Directory containing Ansible playbooks
const PLAYBOOKS_DIR =
  process.env.ANSIBLE_PLAYBOOKS_DIR || "/var/lib/solon/ansible/playbooks";

/**
 * Run an Ansible playbook with the given inventory file and extra variables.
 */
export async function runAnsiblePlaybook(
  playbookName: string,
  inventoryPath: string,
  extraVars: Record<string, string>
): Promise<{ stdout: string; stderr: string }> {
  const playbookPath = path.join(PLAYBOOKS_DIR, playbookName);

  const args: string[] = [
    playbookPath,
    "-i",
    inventoryPath,
    "--extra-vars",
    JSON.stringify(extraVars),
    "--timeout",
    "120",
  ];

  try {
    const result = await execFileAsync(ANSIBLE_PLAYBOOK_BIN, args, {
      timeout: 600_000, // 10 minute timeout
      env: {
        ...process.env,
        ANSIBLE_HOST_KEY_CHECKING: "False",
        ANSIBLE_FORCE_COLOR: "0",
      },
    });
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(
      `Ansible playbook ${playbookName} failed: ${execError.stderr || execError.message}`
    );
  }
}
