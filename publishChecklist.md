### npm publish checklist

Beta versions are still published under the **`latest`** dist-tag so
`npm install @sineways/react-tablefront` resolves to the newest beta.
`publishConfig.tag` in `package.json` enforces this even if `--tag` is omitted
(npm would otherwise use the prerelease id `beta` as the dist-tag).

- [ ] Confirm you are logged in to npm with publish rights for `@sineways`.

```bash
npm whoami || npm login --scope=@sineways
```

- [ ] Finish and commit the release changes, then verify the working tree is clean.

```bash
git status --porcelain
npm ci
npm run typecheck
npm run build
npm pack --dry-run --json
```

- [ ] When the release is ready, bump to the next beta. From
  `1.0.0-beta.6`, this produces `1.0.0-beta.7`, updates `package.json` and
  `package-lock.json`, creates a version commit, and tags it by default.

```bash
npm version prerelease --preid=beta
```

- [ ] Review the version commit and tag, then perform a final publish dry run.

```bash
git show --stat --oneline HEAD
git tag --points-at HEAD
npm publish --dry-run --access public
```

- [ ] From the package root, publish. The `latest` dist-tag comes from
  `publishConfig.tag` (override only if intentional: `npm publish --tag …`).
  `prepublishOnly` will clean, rebuild, verify, and stub the package before upload.

```bash
npm publish --access public
```

- [ ] Push the release commit and tag, then verify npm's `latest` tag and version.

```bash
git push origin HEAD --follow-tags
npm view @sineways/react-tablefront version
npm view @sineways/react-tablefront dist-tags --json
npm view @sineways/react-tablefront versions --json
```
