# Code-signing and notarizing the MacVis build

This is the playbook for producing a **signed + notarized** MacVis DMG that opens without macOS Gatekeeper warnings. The default `pnpm build` produces an **unsigned** DMG.

> See [issue #2](https://github.com/asim266/macvis/issues/2) for the tracking thread.

## What you need

| Requirement | Why | Cost |
|---|---|---|
| Apple Developer Program enrollment | Required to issue Developer ID certs | $99 / year |
| Developer ID Application certificate (`.p12`) | Signs the .app bundle | Free once enrolled |
| App-specific password | Submits the bundle to Apple for notarization | Free |
| 10 GB of disk space + a stable connection | Notarization upload can be slow | Free |

## Step 1 — Get the cert

1. [Enroll](https://developer.apple.com/programs/enroll/) in the Apple Developer Program
2. In Xcode → Settings → Accounts → your team → **Manage Certificates** → `+` → **Developer ID Application**
3. Right-click the cert in Keychain → **Export** → save as `developer-id.p12` with a strong password

## Step 2 — Set env vars

In the shell you'll run `pnpm build` from:

```bash
# Path to the exported .p12
export CSC_LINK="$(realpath ./developer-id.p12)"
# The password you set during export
export CSC_KEY_PASSWORD="<your p12 password>"

# For notarization (Step 4)
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="<app-specific password from appleid.apple.com>"
export APPLE_TEAM_ID="<your 10-character team ID>"
```

Tip: keep these in a local `.envrc` (with [direnv](https://direnv.net/)) — **do not** commit them.

## Step 3 — Build with signing turned on

```bash
pnpm build \
  --config.mac.identity="Developer ID Application: <Your Name> (<TEAMID>)" \
  --config.mac.hardenedRuntime=true
```

You can find the exact identity string with:
```bash
security find-identity -v -p codesigning
```

The build will:
1. Compile main/preload/renderer with `electron-vite`
2. Code-sign the `.app` bundle and every binary inside it
3. Apply the entitlements from `assets/entitlements.mac.plist`
4. Wrap into a `.dmg`

## Step 4 — Notarize

```bash
pnpm build \
  --config.mac.identity="Developer ID Application: <Your Name> (<TEAMID>)" \
  --config.mac.hardenedRuntime=true \
  --config.mac.notarize=true
```

`electron-builder` will:
1. Sign as in Step 3
2. Upload to Apple's notarization service (5-15 min)
3. Staple the notarization ticket back onto the DMG

When done you'll have `dist/MacVis-<version>-arm64.dmg` and `-x64.dmg` that open without any Gatekeeper warning.

## Step 5 — Publish

```bash
pnpm build --publish always
```

This signs, notarizes, and uploads the DMGs to GitHub Releases automatically. Requires `GH_TOKEN` in env (a GitHub PAT with `repo` scope).

## Troubleshooting

**`The specified item could not be found in the keychain`**
The cert isn't in your Keychain. Run `security find-identity -v -p codesigning` — if your Developer ID cert isn't listed, re-import the `.p12`.

**`hardenedRuntime requires a signing identity`**
You enabled `hardenedRuntime: true` but `identity` resolved to `null`. Either set `CSC_LINK` + `CSC_KEY_PASSWORD` or pass `--config.mac.identity=...` on the CLI.

**Notarization fails with "Invalid Bundle"**
Usually means a binary inside the bundle isn't signed. The entitlements file allows unsigned dylibs (`com.apple.security.cs.disable-library-validation`) — verify it's being applied:
```bash
codesign -d --entitlements - /Applications/MacVis.app
```

**`xcrun: error: unable to find utility "notarytool"`**
Update Xcode → Settings → Components → install the latest command-line tools.

## Why this is non-trivial

Apple's notarization process is the same as for any commercial Mac app:
- Every Mach-O binary inside `Electron.framework` gets signed individually
- The `.app` bundle gets a single sealed signature
- The signed bundle is zipped, uploaded to Apple's servers, scanned for known malware patterns, then a "ticket" is issued
- The ticket is stapled back onto the bundle so future launches don't need network

For an Electron app shipping ~100 native binaries, this takes 5-15 min per architecture, and you have to do it for both arm64 and x64 in our case.

## Future automation

GitHub Actions can run this in CI on every tag. See `.github/workflows/release.yml` (TODO — also tracked under issue #2).

The encrypted secrets needed in CI:
- `MAC_CSC_LINK_BASE64` — base64-encoded `.p12`
- `MAC_CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `GH_TOKEN`

Decode `CSC_LINK` from base64 at the start of the workflow:
```yaml
- run: echo "${{ secrets.MAC_CSC_LINK_BASE64 }}" | base64 -d > /tmp/cert.p12
  env: { CSC_LINK: /tmp/cert.p12 }
```
