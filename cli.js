#!/usr/bin/env node

const chalk = require('chalk')
const program = require('commander')
const globby = require('globby')
const os = require('os')
const path = require('path')
const git = require('simple-git/promise')
const { table } = require('table')

;(async () => {
  program
    .version('0.0.0', '-v, --version')
    .option('-f, --fetch', '')
    .option('--no-fetch', '')
    .parse(process.argv)

  const reposPath = program.reposPath.replace('~', os.homedir())

  if (!reposPath) {
    console.error(chalk.red('Usage: repo-branches <repos-path> [--fetch]'))
    process.exit(1)
  }

  const repos = await globby(
    path.resolve(__dirname, reposPath) + '/*',
    { onlyDirectories: true }
  )
  const rows = repos.map(async repo => {
    const gitRepo = git(repo)
    await gitRepo.fetch()
    const repoStatus = await gitRepo.status()
    const {
      ahead,
      behind,
      created,
      current: currentBranch,
      deleted,
      modified,
      not_added: notAdded,
      renamed,
      staged,
      tracking: trackingBranch
    } = repoStatus

    const dirty = created.length || deleted.length || modified.length ||
      notAdded.length || renamed.length || staged.length
    let trackingStatus = ''

    const branchName = currentBranch === 'master'
      ? chalk.blue(currentBranch)
      : chalk.yellow(currentBranch)
    const cleanliness = dirty ? chalk.red('Dirty') : chalk.green('Clean')

    if (ahead) trackingStatus += chalk.red(`${ahead} ahead`)
    if (behind) trackingStatus += chalk.red(ahead ? `/${behind} behind` : `${behind} behind`)
    if (ahead || behind) trackingStatus += chalk.red(` ${trackingBranch}`)
    else trackingStatus += chalk.green('Up to date')

    return [
      path.basename(repo),
      branchName,
      cleanliness,
      trackingStatus
    ]
  })

  Promise.all(rows).then(rows => {
    console.log(table([
      ['Repo', 'Branch', 'Working Directory', 'Tracking Branch'],
      ...rows
    ]))
  })
})().catch(console.error)
