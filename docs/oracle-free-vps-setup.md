# Oracle Cloud free A1 VPS — setup & rebuild guide

Everything we did to stand up a **free-forever Oracle Ampere A1 ARM VPS** for
Riocut (to offload video rendering from the DigitalOcean box), plus how to
rebuild it and the guardrails that keep it at **$0**.

Last set up: 2026-08-02.

---

## TL;DR — what exists

| Thing | Value |
|---|---|
| **A1 instance** | `riocut-a1-sg` — **2 OCPU / 12 GB / 200 GB**, Ubuntu 24.04 (aarch64) |
| **Public IP** | `161.118.213.166` (RESERVED static IP — stable across Stop/Start and Reboot) |
| **SSH (from Mac)** | `ssh -i ~/.ssh/sg_a1_key ubuntu@161.118.213.166` |
| **Region / Home** | `ap-singapore-1` (home region — free tier only works here) |
| **Cost** | **$0** — within Always Free; enforced by a quota hard-cap |

Two separate Oracle accounts are in play:
- **Account B — Singapore, Pay As You Go** → holds the A1 above. Email `bibektimilsina000@gmail.com`.
- **Account A — Tokyo, Free tier** → a separate capacity "grabber" still hunting an A1 (see bottom).

---

## The free tier, precisely (so 2/12 isn't a surprise)

Per Oracle docs (`FreeTier/freetier_topic-Always_Free_Resources.htm`):
- **Ampere A1 compute:** first **1,500 OCPU-hours + 9,000 GB-hours / month free** =
  **2 OCPU + 12 GB run 24/7**. (2 × 744h = 1,488 OCPU-h ≤ 1,500; 12 × 744 = 8,928 GB-h ≤ 9,000.)
- **Block storage:** **200 GB total** (boot + block combined) in the home region.
- A **4 OCPU / 24 GB** box is NOT free on PAYG — it's double the free tier, ~**$27/month**.
- **Service limit ≠ free tier.** The account's A1 *limit* is 250 cores; that's just the
  max you're *allowed* to provision. Only 2 OCPU / 12 GB is *free*.

---

## Guardrails keeping it at $0

1. **Quota hard-cap** — policy `riocut-free-hardcap` (created in the tenancy/root):
   ```
   zero compute quotas in tenancy
   set block-storage quota total-storage-gb to 200 in tenancy
   set block-storage quota backup-count to 0 in tenancy
   ```
   → **Blocks creating ANY new compute** (paid or free), caps storage at 200 GB, blocks
   backups. Applies to everyone incl. admin. The existing A1 is unaffected (quotas only
   block *new* creation). **To rebuild the A1 you must loosen this first** (see below).

2. **Budget alert** — budget `riocut-free-guard` ($1/mo), alert rule at **1% ($0.01) ACTUAL**
   spend → emails `bibektimilsina000@gmail.com` the instant anything bills.

3. Only uncapped vector is **egress** (10 TB/mo free — a render box won't touch it).

---

## Where the credentials live

- **OCI API key** (account B): private key on the DO box at `/root/.oci/sg_api_key.pem`,
  and locally at `~/.oci/sg_api_key.pem`. Profile `[SG]` in `/root/.oci/config` on the
  DO box (`159.223.171.245`), region `ap-singapore-1`.
- **Instance SSH key**: `/root/.oci/sg_instance_key` on the DO box; `~/.ssh/sg_a1_key` on the Mac.
- Run any OCI CLI command for account B with: `oci --profile SG ...` (from the DO box).
- You can revoke the API key anytime in the console (My profile → API keys); it's only
  needed to manage the account via CLI.

### OCIDs (for rebuild)

```
tenancy   ocid1.tenancy.oc1..aaaaaaaackzxn4rhqrfmdyhhakm5bvljrhh755wrbnexovg2nxoycee4go4a
user      ocid1.user.oc1..aaaaaaaaa356j4iw736el2jp2ei7cklttantnvcbic6biruk333h4mlckk3q
region    ap-singapore-1
AD        FmSu:AP-SINGAPORE-1-AD-1
VCN       ocid1.vcn.oc1.ap-singapore-1.amaaaaaagk6af7ya76dtugr6f2obyzjxgil6ojzuoo6svr3upljfan6rvqgq
subnet    ocid1.subnet.oc1.ap-singapore-1.aaaaaaaai46i5slo5tfoq7ssppup4awqgoacodl3mt6rxnnumebbf2ze2roq
image     Canonical-Ubuntu-24.04-aarch64 → re-query for the latest (see rebuild step 2)
instance  ocid1.instance.oc1.ap-singapore-1.anzwsljrgk6af7yc67hh2qixyza52rbypdxopl5meghe63mmivnvcx4a4uzq
```

---

## Restart vs terminate

- **Reboot** → OS restart, keeps instance + data + **IP**. Safest.
- **Stop → Start** → keeps data, but **IP changes** and A1 start may need to wait for
  capacity. Prefer Reboot for a simple restart.
- **Terminate** → **permanent delete.** Only if you're scrapping the box. Rebuild then
  requires loosening the quota (below).

---

## Rebuild from scratch (if terminated)

All commands run on the DO box (`ssh root@159.223.171.245`), using `OCI=$(command -v oci)`
and `T=<tenancy OCID above>`.

**1. Loosen the quota** (the hard-cap blocks new compute). Either delete it:
```
oci --profile SG limits quota list --compartment-id "$T"     # get the quota OCID
oci --profile SG limits quota delete --quota-id <quota-ocid> --force
```
…or edit its statements to allow A1. Re-create the hard-cap (top of this doc) afterward.

**2. Find the current Ubuntu 24.04 ARM image** (OCIDs rotate):
```
oci --profile SG compute image list --compartment-id "$T" \
  --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
  --shape "VM.Standard.A1.Flex" --sort-by TIMECREATED \
  --query "data[0].id" --raw-output
```

**3. Launch (2 OCPU / 12 GB / 200 GB, public IP, your SSH key):**
```
PUB=$(cat /root/.oci/sg_instance_key.pub)
oci --profile SG compute instance launch \
  --availability-domain "FmSu:AP-SINGAPORE-1-AD-1" --compartment-id "$T" \
  --shape VM.Standard.A1.Flex --shape-config '{"ocpus":2,"memoryInGBs":12}' \
  --image-id <image-ocid-from-step-2> \
  --subnet-id ocid1.subnet.oc1.ap-singapore-1.aaaaaaaai46i5slo5tfoq7ssppup4awqgoacodl3mt6rxnnumebbf2ze2roq \
  --boot-volume-size-in-gbs 200 --assign-public-ip true \
  --display-name riocut-a1-sg \
  --metadata "{\"ssh_authorized_keys\":\"$PUB\"}"
```
If it returns **"Out of host capacity"**, retry every 1–2 min (loop) — PAYG usually lands fast.

**4. Get the public IP once RUNNING:**
```
oci --profile SG compute instance list-vnics --instance-id <new-instance-ocid> \
  --query "data[0].\"public-ip\"" --raw-output
```

**5. Re-apply the quota hard-cap** from the "Guardrails" section.

**6. If the VCN/subnet is also gone**, recreate networking via the console's
"Create instance" wizard (it builds VCN + public subnet + internet gateway +
SSH ingress automatically), then reuse that subnet OCID.

---

## Account A — Tokyo grabber (separate account, still running)

- Systemd service **`a1-grab`** on the DO box → `/root/a1-grab.sh`, logs `/root/a1-grab.log`.
- Targets **Tokyo** (`ap-tokyo-1`), **2 OCPU / 12 GB / 200 GB**, retries every ~2 min.
- Uses the `[DEFAULT]` OCI profile on the box (Tokyo account, free tier).
- Status: `systemctl status a1-grab`; stop with `systemctl stop a1-grab && systemctl disable a1-grab`.
- This is a *second* free A1 attempt; independent of the Singapore box above.
