const esp = require('error-stack-parser')
const { app, remote } = require('electron')
const colors = require('colors/safe')
const startTime = Date.now()

const emojiFontCss = 'font-family: Roboto, "Apple Color Emoji", NotoEmoji, "Helvetica Neue", Arial, Helvetica, NotoMono, sans-serif !important;'

const rc = remote ? remote.app.rc : app ? app.rc : {}

const LoggerVariants = [
  { log: console.debug, level: 'DEBUG', emoji: '🕸️' },
  { log: console.info, level: 'INFO', emoji: 'ℹ️' },
  { log: console.warn, level: 'WARNING', emoji: '⚠️' },
  { log: console.error, level: 'ERROR', emoji: '🚨' },
  { log: console.error, level: 'CRITICAL', emoji: '🚨🚨' }
]

function printProcessLogLevelInfo () {
  /* ignore-console-log */
  console.info(`%cLogging Levels:\n${LoggerVariants.map((v) => `${v.emoji} ${v.level}`).join('\n')}`, emojiFontCss)
}

let handler

function setLogHandler (LogHandler) {
  handler = LogHandler
}

function log ({ channel, isMainProcess }, level, stacktrace, args) {
  const variant = LoggerVariants[level]
  if (!handler) {
    /* ignore-console-log */
    console.log('Failed to log message - Handler not initilized yet')
    /* ignore-console-log */
    console.log(`Log Message: ${channel} ${level} ${args.join(' ')}`)
    throw Error('Failed to log message - Handler not initilized yet')
  }
  handler(channel, variant.level, stacktrace, ...args)
  if (rc['log-to-console']) {
    if (isMainProcess) {
      const begining = `${Math.round((Date.now() - startTime) / 100) / 10}s ${[
        '[D]',
        colors.blue('[i]'),
        colors.yellow('[w]'),
        colors.red('[E]'),
        colors.red('[C]')
      ][level]}${colors.grey(channel)}:`
      if (!stacktrace) {
        /* ignore-console-log */
        console.log(begining, ...args)
      } else {
        /* ignore-console-log */
        console.log(begining, ...args, colors.red(stacktrace))
      }
    } else {
      const prefix = `%c${variant.emoji}%c${channel}`
      const prefixStyle = [emojiFontCss, 'color:blueviolet;']

      if (stacktrace) {
        variant.log(prefix, ...prefixStyle, stacktrace, ...args)
      } else {
        variant.log(prefix, ...prefixStyle, ...args)
      }
    }
  }
}

function getStackTrace () {
  const rawStack = esp.parse(new Error('Get Stacktrace'))
  const stack = rawStack.slice(2, rawStack.length)
  return rc['machine-readable-stacktrace'] ? stack : stack.map(s => `\n${s.toString()}`).join()
}

class Logger {
  constructor (channel, isMainProcess) {
    this.channel = channel
    this.isMainProcess = isMainProcess
  }

  debug (...args) {
    if (!rc['log-debug']) return
    log(this, 0, undefined, args)
  }

  info (...args) {
    log(this, 1, undefined, args)
  }

  warn (...args) {
    log(this, 2, getStackTrace(), args)
  }

  error (...args) {
    log(this, 3, getStackTrace(), args)
  }

  critical (...args) {
    log(this, 4, getStackTrace(), args)
  }
}

function getLogger (channel, isMainProcess = false) {
  return new Logger(channel, isMainProcess)
}

module.exports = { setLogHandler, Logger, getLogger, printProcessLogLevelInfo }
