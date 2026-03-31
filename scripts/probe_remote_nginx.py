import paramiko

HOST = "81.71.44.180"
USER = "root"
PASSWORD = "Yiguo9527_"

CMDS = [
    "which nginx || true",
    "nginx -v 2>&1 || true",
    "ps -ef | grep -E 'nginx|openresty|tengine' | grep -v grep || true",
    "systemctl list-unit-files | grep -E 'nginx|openresty|tengine' || true",
    "systemctl list-units --type=service | grep -E 'nginx|openresty|tengine' || true",
    "ls -l /etc/nginx/conf.d/dw-web.conf || true",
    "nginx -t 2>&1 || true",
]


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    try:
        for cmd in CMDS:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            code = stdout.channel.recv_exit_status()
            out = stdout.read().decode("utf-8", "ignore").strip()
            err = stderr.read().decode("utf-8", "ignore").strip()
            print(f"\n### {cmd}\nexit={code}\n{out or err}")
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
