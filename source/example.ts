import Argument from './index.js' // from '@bevry/argument'
const help = `
	USAGE:
	myprogram [...options]

	OPTIONS:
	--help
	  output usage information

	--string=<string>
	  a string option

	--number=<number>
	  a number option

	--[no-]boolean[=<boolean>]
	  a boolean option

	--
	  Process remaining arguments without any parsing`

interface Options {
	string?: string
	number?: number
	boolean?: boolean
	vargs?: Array<string>
}

async function action(opts: Options) {
	console.log(opts)
}

async function parse(args: Array<string>) {
	const opts: Options = {}
	while (args.length) {
		const a = new Argument(args.shift()!)
		switch (a.key) {
			case '--': {
				opts.vargs = args
				if (opts.vargs.length === 0) {
					return a.error('when --, provide at least one argument')
				}
				break
			}
			case 'help': {
				return Argument.help(help)
			}
			case 'string': {
				opts.string = a.string({
					enabled: 'when --string, use this value, otherwise throw',
					disabled: 'when --no-string, use this value, otherwise throw',
					enabledEmpty: 'when --string=, use this value, otherwise throw',
					disabledEmpty: 'when --no-string=, use this value, otherwise throw',
				})
				break
			}
			case 'number': {
				opts.number = a.number({
					enabled: 1, // 'when --number, use this value, otherwise throw'
					disabled: -1, // 'when --no-number, use this value, otherwise throw'
					enabledEmpty: 0, // 'when --number=, use this value, otherwise throw'
					disabledEmpty: 0, // 'when --no-number=, use this value, otherwise throw'
				})
				break
			}
			case 'boolean': {
				opts.boolean = a.boolean()
				break
			}
			default: {
				switch (a.value) {
					default: {
						return a.unknown()
					}
				}
			}
		}
		await action(opts)
	}
}

parse(process.argv.slice(2)).catch(Argument.catch(help))
