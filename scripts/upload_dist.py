"""上传 dist/ 到远端 /data/wreport-web/，然后重启 nginx"""
import os
import paramiko
from pathlib import Path

HOST     = "81.71.44.180"
USER     = "root"
PASSWORD = "Yiguo9527_"
REMOTE_DIR = "/data/wreport-web"
LOCAL_DIST = Path(__file__).parent.parent / "dist"


def upload_dir(sftp, local_dir: Path, remote_dir: str):
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    for item in local_dir.iterdir():
        r = remote_dir + "/" + item.name
        if item.is_dir():
            upload_dir(sftp, item, r)
        else:
            sftp.put(str(item), r)
            print(f"  OK {r}")


def run_cmd(ssh, cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", "ignore").strip()
    err = stderr.read().decode("utf-8", "ignore").strip()
    print(f"  [{code}] {cmd}\n  {out or err or '(ok)'}")
    return code


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"连接 {HOST} ...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = ssh.open_sftp()

    # 清空旧文件
    print("清空旧 dist ...")
    run_cmd(ssh, f"rm -rf {REMOTE_DIR}/assets {REMOTE_DIR}/index.html")

    # 上传新 dist
    print(f"上传 dist/ → {REMOTE_DIR} ...")
    upload_dir(sftp, LOCAL_DIST, REMOTE_DIR)
    sftp.close()

    # 重启 nginx
    print("重启 nginx ...")
    run_cmd(ssh, "fuser -k 8089/tcp 2>/dev/null || true")
    run_cmd(ssh, "systemctl restart nginx 2>&1 || nginx -s reload 2>&1 || true")
    run_cmd(ssh, "sleep 1 && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8089/")

    ssh.close()
    print("完成！")


if __name__ == "__main__":
    main()
