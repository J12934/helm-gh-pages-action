const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const io = require('@actions/io');
const ioUtil = require('@actions/io/lib/io-util');

const { readdirSync } = require('fs');
const path = require('path');

const getDirectories = fileName =>
  readdirSync(fileName, {
    withFileTypes: true,
  })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

async function run() {
  try {
    const accessToken = core.getInput('access-token');
    if (!accessToken) {
      core.setFailed(
        'No personal access token found. Please provide one by setting the `access-token` input for this action.'
      );
      return;
    }

    const deployBranch = core.getInput('deploy-branch');
    if (!deployBranch) deployBranch = 'master';

    const chartDir = core.getInput('charts-folder');

    if (github.context.ref === `refs/heads/${deployBranch}`) {
      console.log(`Triggered by branch used to deploy: ${github.context.ref}.`);
      console.log('Nothing to deploy.');
      return;
    }

    await exec.exec(`helm init --client-only`);
    console.log('Initialized helm client');

    const chartDirectories = getDirectories(path.resolve(chartDir));

    for (const chartDirname of chartDirectories) {
      console.log(`Packaging helm chart in directory ${chartDirname}`);
      await exec.exec(
        `helm package`,
        chartDirname,
        '--destination',
        './output',
        { cwd: chartDir }
      );
    }

    console.log('Packaged all helm charts.');
    console.log(`Building index.yaml`);

    await exec.exec(`helm repo index`, `./output`);

    console.log(`Successfully build index.yaml.`);

    const cnameExists = await ioUtil.exists('./CNAME');
    if (cnameExists) {
      console.log('Copying CNAME over.');
      await io.cp('./CNAME', './output/CNAME', { force: true });
      console.log('Finished copying CNAME.');
    }

    const repo = `${github.context.repo.owner}/${github.context.repo.repo}`;
    const repoURL = `https://${accessToken}@github.com/${repo}.git`;
    console.log('Ready to deploy your new shiny site!');
    console.log(`Deploying to repo: ${repo} and branch: ${deployBranch}`);
    console.log(
      'You can configure the deploy branch by setting the `deploy-branch` input for this action.'
    );
    await exec.exec(`git clone`, [], { cwd: './public' });
    await exec.exec(`git config user.name`, [github.context.actor], {
      cwd: './public',
    });
    await exec.exec(
      `git config user.email`,
      [`${github.context.actor}@users.noreply.github.com`],
      { cwd: './public' }
    );
    await exec.exec(`git add`, ['.'], { cwd: './public' });
    await exec.exec(
      `git commit`,
      ['-m', `deployed via ⎈ Helm Publish Action for ${github.context.sha}`],
      { cwd: './public' }
    );
    await exec.exec(`git push`, [repoURL, `master:${deployBranch}`], {
      cwd: './public',
    });
    console.log('Finished deploying your site.');

    console.log('Enjoy! ✨');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
