import paramiko

HOST = "81.71.44.180"
USER = "root"
PASSWORD = "Yiguo9527_"

CMDS = [
    r"grep -R \"listen[[:space:]]*8083\" -n /etc/nginx/conf.d/*.conf || true",
    r"for f in /etc/nginx/conf.d/*.conf; do grep -q \"listen[[:space:]]*8083\" \"$f\" && mv \"$f\" \"$f.disabled\"; done",
    r"ls -la /etc/nginx/conf.d | sed -n '1,200p'",
    r"nginx -t",
    r"systemctl restart nginx || service nginx restart || nginx",
    r"ss -lntp | grep -E ':8089|:8083|:80' || true",
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
            if code != 0 and cmd in ("nginx -t", r"systemctl restart nginx || service nginx restart || nginx"):
                raise RuntimeError(f"failed: {cmd}")
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
