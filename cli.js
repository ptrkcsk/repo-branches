#!/usr/bin/env node

const chalk = require('chalk')
const globby = require('globby')
const os = require('os')
const path = require('path')
const git = require('simple-git/promise')
const { table } = require('table')

;(async () => {
  let [, , reposPath] = process.argv

  if (!reposPath) {
    console.error(chalk.red('Usage: BIN_NAME_TBD repos-path'))
    process.exit(1)
  }

  reposPath = reposPath.replace('~', os.homedir())

  const repos = await globby(
    path.resolve(__dirname, reposPath) + '/*',
    { onlyDirectories: true }
  )
  const repoRows = repos.map(async repo => {
    const gitRepo = git(repo)

    if (!await gitRepo.checkIsRepo()) return null

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

  const headerRow = ['Repo', 'Branch', 'Working Directory', 'Tracking Branch']
    .map(header => chalk.bold(header))

  Promise.all(repoRows).then(repoRows => {
    repoRows = repoRows.filter(row => row)

    console.log(
      table(
        [
          headerRow,
          ...repoRows
        ],
        { columnDefault: { width: 25 } }
      )
    )
  })
})().catch(console.error)
