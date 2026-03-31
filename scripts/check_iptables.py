import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("81.71.44.180", username="root", password="Yiguo9527_", timeout=20)

cmds = [
    "iptables -L INPUT -n --line-numbers | head -25",
    "curl -sv --connect-timeout 5 http://81.71.44.180:8089/ 2>&1 | head -20",
]

for c in cmds:
    _, stdout, stderr = ssh.exec_command(c)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", "ignore").strip()
    err = stderr.read().decode("utf-8", "ignore").strip()
    print(f"\n### {c}\n{out or err}")

ssh.close()
