### npm publish checklist

- [ ] Confirm you are logged in to npm with publish rights for `@sineways`.
Commands:
```bash
npm whoami || npm login --scope=@sineways
```
- [ ] Bump the `version` in `Tablefront/Tablefront/package.json` (SemVer or next beta).
Commands (choose one):
```bash
# beta pre-release bump
npm version prerelease --preid=beta

# or stable bump
npm version patch
# npm version minor
# npm version major
```
- [ ] Working tree clean; run typecheck/build locally; verify no errors.
Commands:
```bash
git status --porcelain
npm ci
npm run typecheck
npm run build
```
- [ ] Commit the version bump (e.g., "Release vX.Y.Z"), optionally create a matching tag.
Commands (if needed; `npm version` already commits and tags):
```bash
git add package.json package-lock.json
git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin HEAD --tags
```
- [ ] From `Tablefront/Tablefront`, run the publish step. `prepublishOnly` will build.
Commands:
```bash
npm publish --access public --tag latest
```
- [ ] Verify the new version on npm.
Commands:
```bash
npm view @sineways/react-tablefront version
npm view @sineways/react-tablefront versions --json
```

