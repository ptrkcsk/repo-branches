#!/usr/bin/env node

const os = require('os')
const path = require('path')

const chalk = require('chalk')
const commander = require('commander')
const globby = require('globby')
const git = require('simple-git/promise')
const { table } = require('table')

const pkg = require('./package.json')

;(async () => {
  const program = commander
  let reposPath

  program
    .name('repo-branches')
    .version(pkg.version, '-v, --version')

  program
    .arguments('<repos-path>')
    .action(path => reposPath = path)

  program
    .option('-f, --fetch', 'fetch remote refs before checking status', false)

  program.parse(process.argv)

  if (!reposPath) {
    program.outputHelp(chalk.red)
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

    if (program.fetch) await gitRepo.fetch()

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
