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
    .filter(dirent => !(/(^|\/)\.[^\/\.]/g).test(dirent))
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

    const chartsDir = core.getInput('charts-folder');

    if (github.context.ref === `refs/heads/${deployBranch}`) {
      console.log(`Triggered by branch used to deploy: ${github.context.ref}.`);
      console.log('Nothing to deploy.');
      return;
    }

    const repo = `${github.context.repo.owner}/${github.context.repo.repo}`;
    const repoURL = `https://${accessToken}@github.com/${repo}.git`;
    console.log('Ready to deploy your new shiny site!');
    console.log(`Deploying to repo: ${repo} and branch: ${deployBranch}`);
    console.log(
      'You can configure the deploy branch by setting the `deploy-branch` input for this action.'
    );
    await exec.exec(`git clone`, ['-b', deployBranch, repoURL, 'output'], {
      cwd: './',
    });
    await exec.exec(`git config user.name`, [github.context.actor], {
      cwd: './output',
    });
    await exec.exec(
      `git config user.email`,
      [`${github.context.actor}@users.noreply.github.com`],
      { cwd: './output' }
    );

    const chartDirectories = getDirectories(path.resolve(`./${chartsDir}`));

    console.log('Charts dir content');
    await exec.exec(`ls`, ['-I ".*"'], { cwd: `./${chartsDir}` });
    for (const chartDirname of chartDirectories) {
      console.log(`Resolving helm chart dependency in directory ${chartDirname}`);
      await exec.exec(
        `helm dependency update`,
        [],
        { cwd: `./${chartsDir}/${chartDirname}` }
      );
      
      console.log(`Packaging helm chart in directory ${chartDirname}`);
      await exec.exec(
        `helm package`,
        [chartDirname, '--destination', '../output'],
        { cwd: `./${chartsDir}` }
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

    await exec.exec(`git add`, ['.'], { cwd: './output' });
    await exec.exec(
      `git commit`,
      ['-m', `deployed via ⎈ Helm Publish Action for ${github.context.sha}`],
      { cwd: './output' }
    );
    await exec.exec(`git push`, ['-u', 'origin', `${deployBranch}`], {
      cwd: './output',
    });
    console.log('Finished deploying your site.');

    console.log('Enjoy! ✨');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
