import paramiko

HOST = "81.71.44.180"
USER = "root"
PASSWORD = "Yiguo9527_"

CMDS = [
    "pkill -9 nginx || true",
    "sleep 1",
    "nginx -t",
    "systemctl restart nginx || service nginx restart || nginx",
    "ss -lntp | grep -E ':8089|:80' || true",
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
            if code != 0 and cmd == "nginx -t":
                raise RuntimeError("nginx -t failed")
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
