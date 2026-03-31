import paramiko

HOST = "81.71.44.180"
USER = "root"
PASSWORD = "Yiguo9527_"

CMDS = [
    "systemctl status nginx --no-pager -l || true",
    "journalctl -u nginx -n 80 --no-pager || true",
    "ls -la /etc/nginx/conf.d || true",
    "grep -R \"server_name\" -n /etc/nginx/conf.d /etc/nginx/nginx.conf || true",
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
