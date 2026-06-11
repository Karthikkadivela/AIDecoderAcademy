# AWS SES Setup — AIDA Support Tickets

One-time setup so AIDA can email support tickets to **support@aidecoderacademy.org**.
All tickets go to one address we own, so we stay in **SES sandbox mode** → **$0 cost**, no production-access request needed.

**Region:** `us-east-1` (must match `AWS_REGION` in the app).
**Who runs this:** an AWS admin with access to the SES console, IAM, the domain DNS, and the `support@` inbox.

---

## Part A — Verify identities in the SES console

### Step 1 — Open SES in the correct region
1. Sign in to the AWS Console.
2. Search **"Amazon SES"** → open it.
3. Top-right region selector → choose **US East (N. Virginia) `us-east-1`**.

### Step 2 — Verify the SENDER ("From" address)
SES will not send from an unverified sender. Pick ONE option.

**Option 2a — Single email (fastest, ~2 min)**
1. Left nav → **Identities** → **Create identity**.
2. Identity type: **Email address**.
3. Enter `no-reply@aidecoderacademy.org` → **Create identity**.
4. AWS emails that inbox a confirmation link → open it → click **verify**.
5. Back in SES the identity shows **Verified**.

**Option 2b — Whole domain (best deliverability, recommended for production)**
1. **Identities** → **Create identity** → **Domain**.
2. Enter `aidecoderacademy.org`, keep **Easy DKIM** enabled.
3. AWS shows **3 CNAME records** → add them to the domain's DNS (registrar / Cloudflare / Route 53).
4. Wait for DNS to propagate; SES flips the identity to **Verified** (minutes to a few hours).
5. Any `@aidecoderacademy.org` sender is then allowed.

### Step 3 — Verify the RECIPIENT (the sandbox trick)
Because the account is in sandbox, you can only send TO verified addresses. We only ever send to `support@`, so verify it once:
1. **Identities** → **Create identity** → **Email address**.
2. Enter `support@aidecoderacademy.org` → **Create identity**.
3. Open the link AWS sends to that inbox → **verify**.
4. Confirms **Verified**.

> ✅ With sender + `support@` verified, sandbox mode sends our tickets perfectly. We do NOT request production access. Cost stays $0.
> The student's email goes in the **Reply-To header** (not To), which needs no verification — replying from the support inbox reaches the student.

---

## Part B — IAM permission for the app's API key

The app sends via the credentials in `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. That IAM user needs SES send permission.

1. Console → **IAM** → **Users** → select the user whose key the app uses.
2. **Add permissions** → **Create inline policy** → **JSON** → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESSend",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```
3. Name it `aida-ses-send` → **Create policy**.

---

## Part C — Environment variables

Add to `.env.local` (local) **and** Vercel → Project → Settings → Environment Variables (Production + Preview):

```env
SUPPORT_EMAIL=support@aidecoderacademy.org
SES_FROM_EMAIL=no-reply@aidecoderacademy.org
# AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY already exist
```
Redeploy on Vercel after adding them so the serverless functions pick them up.

---

## Part D — Test it works (before the feature ships)

### Test 1 — SES console "Send test email"
1. SES → **Identities** → click `no-reply@aidecoderacademy.org` (the verified sender).
2. **Send test email** button.
3. From-address: the verified sender. To: `support@aidecoderacademy.org`. Subject/body: anything.
4. Send → check the **support@** inbox. If it arrives, SES is live.

### Test 2 — AWS CLI (proves the API path the app uses)
Requires AWS CLI installed and configured with the SAME keys the app uses.

PowerShell:
```powershell
aws ses send-email `
  --region us-east-1 `
  --from "no-reply@aidecoderacademy.org" `
  --destination "ToAddresses=support@aidecoderacademy.org" `
  --message "Subject={Data=AIDA SES test AIDA-TEST1},Body={Text={Data=If you can read this in support@, SES works.}}" `
  --reply-to-addresses "student@example.com"
```
- Success → returns a JSON `MessageId`, and the email lands in `support@`.
- Hitting **Reply** in that inbox should address `student@example.com` (proves Reply-To routing).

### Common errors & fixes
| Error | Cause | Fix |
|---|---|---|
| `Email address is not verified` (sender) | Step 2 not done / wrong region | Verify sender in `us-east-1` |
| `Email address is not verified` (recipient) | Step 3 not done | Verify `support@` (sandbox) |
| `AccessDenied ... ses:SendEmail` | IAM policy missing | Part B |
| `Could not connect / region` | wrong region | use `us-east-1` everywhere |

---

## Done checklist
- [ ] Sender verified (email or domain) in `us-east-1`
- [ ] `support@aidecoderacademy.org` verified as recipient
- [ ] `ses:SendEmail` IAM permission added to the app's key
- [ ] `SUPPORT_EMAIL` + `SES_FROM_EMAIL` set locally and on Vercel
- [ ] Test 1 (console) email received at support@
- [ ] Test 2 (CLI) email received + Reply-To routes to the student address

When all boxes are checked, the AIDA ticket feature can send for real. Cost: **$0** at our volume (SES free tier = 3,000 emails/month).
