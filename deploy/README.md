# Deploying Aitbaar always-on (Oracle Cloud Always Free)

One free Linux VM runs the **backend + WhatsApp bot + Caddy** (auto-HTTPS).
The **dashboard** stays on Vercel. Everything stays up with your laptop off.

Result URLs:
- Backend API: `https://api.<your-ip>.nip.io`
- Bot QR page: `https://qr.<your-ip>.nip.io/qr`
- Dashboard: your `*.vercel.app`

---

## 1. Create the Oracle account
1. Go to **cloud.oracle.com** → **Start for free**.
2. Sign up (a card is required for identity verification only — the Always Free resources are never charged). Pick a home region close to you (e.g. a nearby one; ARM capacity varies by region).

## 2. Create the VM (Always Free)
1. Console → hamburger menu → **Compute → Instances → Create instance**.
2. **Image & shape → Edit shape → Ampere (Arm)** → `VM.Standard.A1.Flex`, set **2 OCPU / 12 GB** (well within the free 4-core/24 GB allowance).
   - If it says **"Out of host capacity"**, either try another Availability Domain, or fall back to **VM.Standard.E2.1.Micro** (AMD, 1 GB — works but tight; the compose file still runs, just add swap in step 4).
3. **Image**: Canonical **Ubuntu 22.04**.
4. **Add SSH keys** → **Generate a key pair** → **download the private key** (keep it safe — it's your only way in).
5. **Networking**: leave the default VCN/subnet, **Assign a public IPv4 address = Yes**.
6. **Create.** When it's running, copy the **Public IP address**.

## 3. Open the firewall (TWO places — this is the #1 gotcha)
**a) Oracle security list:** Instance page → **Virtual Cloud Network** link → **Security Lists** → default list → **Add Ingress Rules**:
- Source `0.0.0.0/0`, IP Protocol TCP, Destination port **80**
- Source `0.0.0.0/0`, IP Protocol TCP, Destination port **443**

(SSH port 22 is already open.)

**b) The VM's own firewall** (do this after you SSH in, step 4):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. SSH in and install Docker
From your laptop (PowerShell), replace the path + IP:
```bash
icacls "C:\path\to\private-key.key" /inheritance:r /grant:r "%USERNAME%:R"   # fix key perms on Windows
ssh -i "C:\path\to\private-key.key" ubuntu@<your-ip>
```
Then on the VM:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker
# (only if you used the 1 GB AMD micro) add swap so Chromium doesn't OOM:
# sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```
Now run the two `iptables` lines from step 3b.

## 5. Get the code and configure
```bash
git clone https://github.com/codewithfourtix/aitabaar.git
cd aitabaar/deploy
cp .env.example .env
nano .env
```
Fill in `.env`:
- `OPENROUTER_API_KEY=` your key
- `API_DOMAIN=api.<your-ip>.nip.io`   (keep the dots, e.g. `api.140.238.1.2.nip.io`)
- `QR_DOMAIN=qr.<your-ip>.nip.io`

Save (Ctrl+O, Enter, Ctrl+X).

## 6. Launch
```bash
docker compose up -d --build
```
First build takes ~10–20 min (compiles the ML deps). Then:
```bash
docker compose ps          # all three services "running"
docker compose logs -f caddy   # watch it obtain HTTPS certs, Ctrl+C when done
```
Check: open `https://api.<your-ip>.nip.io/health` → `{"status":"ok"}`.

## 7. Link the WhatsApp number
Open **`https://qr.<your-ip>.nip.io/qr`** → scan with the sach batao phone (WhatsApp → Linked Devices → Link a Device). Page flips to "✅ Linked". The session is on the `bot_session` volume, so redeploys won't re-prompt.

## 8. Point the dashboard at it (Vercel)
Vercel → your dashboard project → **Settings → Environment Variables** → set
`VITE_API_URL = https://api.<your-ip>.nip.io` → **Redeploy**.
(The backend already allows any `*.vercel.app` origin, so CORS just works.)

## 9. Test
Dashboard → **Reset Demo** → 4 applicants incl. the fraud-flag override. Then send `loan` from another phone to the number and run the full flow.

---

## Operating it
- Redeploy after a `git pull`: `cd ~/aitabaar && git pull && cd deploy && docker compose up -d --build`
- Logs: `docker compose logs -f bot`
- Restart bot only: `docker compose restart bot` (session persists)
- The VM's public IP can change if you ever stop/terminate it. To lock it, reserve the IP: Networking → the instance's IP → **Edit → Reserved public IP**. If the IP changes, update `API_DOMAIN`/`QR_DOMAIN` in `.env`, `docker compose up -d`, and Vercel's `VITE_API_URL`.

## If HTTPS won't issue
Caddy needs ports 80+443 reachable. Re-check BOTH firewalls (step 3). Watch `docker compose logs caddy` for the Let's Encrypt error. Until certs issue, the API is unreachable from the HTTPS dashboard.
