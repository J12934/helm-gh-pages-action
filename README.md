# Helm Publish

GitHub Action to package and deploy your Helm charts to GitHub Pages

Based upon [gatsby-gh-pages-action](https://github.com/enriikke/gatsby-gh-pages-action)

## Usage

This GitHub Action will run `helm package` for every chart folder in the `charts` directory of your repository and
deploy it to GitHub Pages for you! Here's a basic workflow example:

```yml
name: Helm Publish

on:
  push:
    branches:
      - dev

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: J12934/helm-gh-pages-action@master
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
```

### Knobs & Handles

This Action is fairly simple but it does provide you with a couple of
configuration options:

- **access-token**: A [GitHub Personal Access Token][github-access-token] with
  the `repo` scope. This is **required** to push the site to your repo after
  Helm finished building it. You should store this as a [secret][github-repo-secret]
  in your repository. Provided as an [input][github-action-input].

- **deploy-branch**: The branch expected by GitHub to have the static files
  needed for your site. For org and user pages it should always be `master`.
  This is where the packaged charts and index.yaml will be pushed to. Provided as an
  [input][github-action-input].
  Defaults to `master`.

- **charts-folder**: Charts folder of your repository. Defaults to `charts`

### Org or User Pages

Create a repository with the format `<YOUR/ORG USERNAME>.github.io`, push your
helm sources to a branch other than `master` and add this GitHub Action to
your workflow! 🚀😃

### CNAME

You have a custom domain you would like to use? Fancy! 😎 This Action's got you
covered! Assuming you have already set up your DNS provider as defined in the
[GitHub Pages docs][github-pages-domain-docs], all we need next is a `CNAME`
file at the root of your project with the domain you would like to use. For
example:

```CNAME
imenrique.com
```

> Notice that it's **all capitals CNAME** 😊.

### Assumptions

TODO

## That's It

Have fun building! ✨
