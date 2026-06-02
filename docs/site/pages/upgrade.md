---
title: Upgrade And Pin
description: Upgrade and version-pinning guidance for the Pairflow CLI package.
order: 3
---

# Upgrade and version pinning

Pairflow release tags use the standard `v<semver>` shape, and `package.json.version` is the repository version authority.

## Upgrade once npm publish is open

```bash
npm install -g {{PACKAGE_NAME}}@latest
pairflow --version
```

Only trust registry availability after the release pilot and npm publish guard have proved a real published package. Local repository version text alone is not registry proof.

## Pin an exact version

For repeatable operator machines or CI images, pin an exact version:

```bash
npm install -g {{PACKAGE_NAME}}@{{PACKAGE_VERSION}}
```

Replace `{{PACKAGE_VERSION}}` with the released version you want after confirming it exists in npm.

## Source checkout upgrades

For contributor installs, update the checkout and rerun the installer:

```bash
git pull --ff-only
./scripts/install.sh
```

Do not mix a source checkout install and a global npm install without checking which `pairflow` binary your shell resolves first.
