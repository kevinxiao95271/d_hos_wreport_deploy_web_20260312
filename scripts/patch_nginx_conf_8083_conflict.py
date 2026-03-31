import paramiko

HOST = "81.71.44.180"
USER = "root"
PASSWORD = "Yiguo9527_"

CMDS = [
    "cp -a /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak.$(date +%Y%m%d%H%M%S)",
    "sed -i 's/listen 8083;/listen 18083;/' /etc/nginx/nginx.conf",
    "grep -n 'listen 8083\\|listen 18083\\|listen 8089' /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf || true",
    "nginx -t",
    "pkill -9 nginx || true",
    "systemctl restart nginx || service nginx restart || nginx",
    "ss -lntp | grep -E ':8089|:8083|:18083' || true",
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
            if code != 0 and cmd in ("nginx -t", "systemctl restart nginx || service nginx restart || nginx"):
                raise RuntimeError(f"failed: {cmd}")
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
