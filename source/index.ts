// builtin
import { exit } from 'node:process'

// external
import Errlop from 'errlop'

/** Trim the initial indentation for the entire string. */
function trimIndentation(string: string) {
	const lines = string.split('\n')
	const firstLine = lines[0] || lines[1] // in case it starts on the second line
	const match = firstLine.match(/^\s+/)
	if (match) {
		const indentation = match[0]
		return lines.map((line) => line.replace(indentation, '')).join('\n')
	} else {
		return string
	}
}

/** Customise the fallbacks. */
export interface FallbackOptions<T> {
	/** when [--key] use this value, otherwise throw */
	enabled?: T | null
	/** when [--no-key] use this value, otherwise throw */
	disabled?: T | null
	/** when [--key=] use this value, otherwise throw */
	enabledEmpty?: T | null
	/** when [--no-key=] use this value, otherwise throw */
	disabledEmpty?: T | null
}

/** An {@link Errlop} instance with defaults configured for argument errors. */
export class ArgumentError extends Errlop {
	readonly exitCode: number = 22
	readonly code: string | number = 'EINVAL'
	readonly orphanStack: string = '' // we don't care for the stack for this error
}

/** Parse a command line argument/flag */
export class Argument {
	/** The entire argument value */
	public readonly arg: string

	/**
	 * If an argument, this is an empty string.
	 * If a flag, this is the name of the flag.
	 * If --, this is --
	 */
	public readonly key: string

	/**
	 * If an argument, this is the argument.
	 * If a flag, this is the value of the flag if present.
	 * If --, this is null
	 */
	public readonly value: string | null = null

	/** If we are a flag */
	public readonly flag: boolean = false

	/** If --no- prefix was used, this becomes true. */
	public readonly inverted: boolean = false

	/** Values that will be considered as true when parsing as a boolean. */
	public readonly truthy = ['true', '1', 'yes', 'y', 'on']

	/** Values that will be considered as false when parsing as a boolean. */
	public readonly falsey = ['false', '0', 'no', 'n', 'off']

	/** Parse our argument, extracting key, value, and inverted. */
	constructor(arg: string) {
		this.arg = arg
		let key: string,
			value: string | null = null
		if (arg === '--') {
			key = '--'
		} else if (arg.startsWith('--')) {
			this.flag = true
			const index = arg.indexOf('=')
			if (index === -1) {
				key = arg.substring(2)
			} else {
				key = arg.substring(2, index)
				value = arg.substring(index + 1)
			}
			if (key.startsWith('no-')) {
				key = key.substring(3)
				this.inverted = true
			}
		} else {
			key = ''
			value = arg
		}
		this.key = key
		this.value = value
	}

	/** Throw an {@link ArgumentError} with a custom message */
	static error(error: any): never {
		throw new ArgumentError(error)
	}

	/** Throw an {@link ArgumentError} with that will output our help message  */
	static help(help: string): never {
		throw new ArgumentError(help)
	}

	/**
	 * Return a catcher that will exit the process with the help message, the error (if any), and the appropriate exit code.
	 * @example `.catch(Argument.catch(help))`
	 */
	static catch(help: string) {
		return (error: any) => this.exit(help, error)
	}

	/** Exit the process with the help message, the error (if any), and the appropriate exit code. */
	static exit(help: string, error?: any): never {
		const string = error?.toString()
		if (error?.exitCode === 22 || !string) {
			console.error(trimIndentation(help).trim())
			if (string && error.message !== help) {
				console.error('\n' + string)
				exit(22)
			} else exit(0)
		} else {
			console.error(string)
			exit(error.exitCode ?? 1)
		}
	}

	/** Throw an {@link ArgumentError} with a custom message */
	error(error: any): never {
		throw Argument.error(error)
	}

	/** Throw an {@link ArgumentError} that this argument is unknown */
	unknown(): never {
		throw this.error(
			this.flag ? `Unknown flag: ${this.arg}` : `Unknown argument ${this.arg}`,
		)
	}

	/** Parse the defaults for the argument. */
	protected fallback<T>(
		error: string,
		{ enabled, disabled, enabledEmpty, disabledEmpty }: FallbackOptions<T> = {},
	): any {
		if (this.value == null) {
			if (this.inverted) {
				if (disabled == null) throw this.error(error)
				return disabled
			} else {
				if (enabled == null) throw this.error(error)
				return enabled
			}
		} else {
			if (this.value === '') {
				if (this.inverted) {
					if (enabledEmpty == null) throw this.error(error)
					return enabledEmpty
				} else {
					if (disabledEmpty == null) throw this.error(error)
					return disabledEmpty
				}
			}
			return this.value
		}
	}

	/** Parse our flag as a string. */
	string<T>(opts: FallbackOptions<T> = {}): T {
		const error =
			`Argument ${this.arg} must have a string value, e.g. ` +
			(this.flag ? `--${this.key}=string` : '<string>')
		return this.fallback<T>(error, opts)
	}

	/** Parse our argument/flag as a number */
	number<T>(opts: FallbackOptions<T> = {}): T {
		const error =
			`Argument ${this.arg} must have a number value, e.g. ` +
			(this.flag ? `--${this.key}=123` : '123')
		const value = this.fallback<T>(error, opts)
		const number = value == null || value === '' ? NaN : Number(value)
		if (isNaN(number)) throw this.error(error)
		return number as any
	}

	/** Parse our argument/flag as a boolean */
	boolean(): boolean {
		if (this.value == null || this.value === '') {
			return !this.inverted
		} else if (this.truthy.includes(this.value)) {
			if (this.inverted) return false
			return true
		} else if (this.falsey.includes(this.value)) {
			if (this.inverted) return true
			return false
		} else {
			const error =
				`Argument ${this.arg} must have a boolean value, e.g. ` +
				(this.flag
					? `--${this.key} or --no-${this.key} or --${this.key}=yes`
					: 'yes')
			throw this.error(error)
		}
	}
}

export default Argument
