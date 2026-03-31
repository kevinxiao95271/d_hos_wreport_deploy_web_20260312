#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from datetime import datetime
from pathlib import Path

import paramiko


HOST = "81.71.44.180"
PORT = 22
USER = "root"
PASSWORD = "Yiguo9527_"

LOCAL_DIST = Path(__file__).resolve().parents[1] / "dist"
BASE_DIR = "/data/dw-web"
RELEASES_DIR = f"{BASE_DIR}/releases"
RELEASE_NAME = datetime.now().strftime("release-%Y%m%d-%H%M%S")
REMOTE_RELEASE_DIR = f"{RELEASES_DIR}/{RELEASE_NAME}"
REMOTE_CURRENT = f"{BASE_DIR}/current"
NGINX_CONF = "/etc/nginx/conf.d/dw-web.conf"

NGINX_TEXT = f"""server {{
    listen 8089;
    server_name _;

    root {REMOTE_CURRENT};
    index index.html;

    location /api/ {{
        proxy_pass http://127.0.0.1:8083;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /wr/ {{
        proxy_pass http://127.0.0.1:8083;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /dw/ {{
        proxy_pass http://127.0.0.1:8083;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}
}}
"""


def run(ssh: paramiko.SSHClient, cmd: str, check: bool = True):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="ignore").strip()
    err = stderr.read().decode("utf-8", errors="ignore").strip()
    if check and code != 0:
        raise RuntimeError(f"cmd failed ({code}): {cmd}\n{err or out}")
    return code, out, err


def sftp_mkdir_p(sftp: paramiko.SFTPClient, remote_dir: str):
    parts = remote_dir.strip("/").split("/")
    curr = "/"
    for p in parts:
        curr = f"{curr}{p}/"
        try:
            sftp.stat(curr)
        except FileNotFoundError:
            sftp.mkdir(curr)


def upload_dir(sftp: paramiko.SFTPClient, local_dir: Path, remote_dir: str):
    sftp_mkdir_p(sftp, remote_dir)
    for p in local_dir.rglob("*"):
        rel = p.relative_to(local_dir).as_posix()
        target = f"{remote_dir}/{rel}"
        if p.is_dir():
            sftp_mkdir_p(sftp, target)
        else:
            parent = target.rsplit("/", 1)[0]
            sftp_mkdir_p(sftp, parent)
            sftp.put(str(p), target)


def main():
    if not LOCAL_DIST.exists():
        raise SystemExit(f"dist not found: {LOCAL_DIST}")

    print(f"[1/5] connect {HOST}")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=20)
    sftp = ssh.open_sftp()

    try:
        print(f"[2/5] upload dist to {REMOTE_RELEASE_DIR}")
        run(ssh, f"mkdir -p '{REMOTE_RELEASE_DIR}'")
        upload_dir(sftp, LOCAL_DIST, REMOTE_RELEASE_DIR)

        print("[3/5] switch current symlink")
        run(ssh, f"mkdir -p '{RELEASES_DIR}'")
        run(ssh, f"ln -sfn '{REMOTE_RELEASE_DIR}' '{REMOTE_CURRENT}'")

        print("[4/5] write nginx conf")
        tmp_conf = "/tmp/dw-web.conf"
        with sftp.open(tmp_conf, "w") as f:
            f.write(NGINX_TEXT)
        run(ssh, f"mv '{tmp_conf}' '{NGINX_CONF}'")

        print("[5/5] nginx test and reload/start")
        run(ssh, "nginx -t")
        code, _, _ = run(ssh, "systemctl reload nginx", check=False)
        if code != 0:
            code2, _, _ = run(ssh, "systemctl restart nginx", check=False)
            if code2 != 0:
                run(ssh, "service nginx restart")

        _, listing, _ = run(ssh, f"ls -la '{BASE_DIR}'")
        print("deploy done")
        print(listing)
        print(f"url: http://{HOST}:8089/")
    finally:
        sftp.close()
        ssh.close()


if __name__ == "__main__":
    main()
