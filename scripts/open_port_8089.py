import paramiko

HOST = "81.71.44.180"
USER = "root"
PASSWORD = "Yiguo9527_"

CMDS = [
    "firewall-cmd --state 2>&1 || true",
    "firewall-cmd --permanent --add-port=8089/tcp 2>&1 || true",
    "firewall-cmd --reload 2>&1 || true",
    "iptables -I INPUT -p tcp --dport 8089 -j ACCEPT 2>&1 || true",
    "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8089/",
    "ss -lntp | grep 8089",
]


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    try:
        for cmd in CMDS:
            _, stdout, stderr = ssh.exec_command(cmd)
            code = stdout.channel.recv_exit_status()
            out = stdout.read().decode("utf-8", "ignore").strip()
            err = stderr.read().decode("utf-8", "ignore").strip()
            print(f"\n### {cmd}\nexit={code}\n{out or err}")
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
