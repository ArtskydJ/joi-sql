var toCamelCase = require('to-camel-case')

function ifValThen(column, property, value, then) {
	var equal = Array.isArray(value) ? value.some(function(value) { return column[property] === value}) : column[property] === value

	return equal ? then : ''
}

var maxIntValues = {
	tinyint: 255,
	smallint: 65535,
	mediumint: 16777215,
	int: 4294967295,
	bigint: 18446744073709551615
}

function getSignedValue(num) {
	return (num - 1) / 2
}

function decimalLessThan(precision) {
	return Math.pow(10, precision)
}

function unrollEnum(col) {
	return col.columntype.match(/enum\((.+)\)/)[1]
}

var checks = [

	function intCheck(column) {
		var checks = ''
		if (maxIntValues[column.datatype]) {
			checks += '.number().integer()'

			var min = 0
			var max = maxIntValues[column.datatype]
			if (column.columntype.indexOf('unsigned') === -1) {
				max = getSignedValue(max)
				min = -1 * (max + 1)
			}

			checks += '.max(' + max + ').min(' + min + ')'
		}

		return checks
	},

	function dateCheck(column) {
		return ifValThen(column, 'datatype', ['datetime', 'date', 'timestamp'], '.date()')
	},

	function stringCheck(column) {
		return ifValThen(column, 'datatype', ['text', 'varchar', 'char'], '.string().max(' + column.charactermaximumlength + ')')
	},

	function boolCheck(column) {
		return (column.datatype === 'bit' && column.numericprecision == '1') ? '.boolean()' : ''
	},

	function decimalCheck(column) {
		return ifValThen(column, 'datatype', 'decimal', '.number().precision('
			+ column.numericscale + ').less(' + decimalLessThan(column.numericprecision - column.numericscale) + ')')
	},

	function enumCheck(column) {
		if (column.datatype === 'enum') {
			return '.any().valid(' + unrollEnum(column) + ')'
		}
		return ''
	},

	function nullableCheck(column) {
		if (column.isnullable === 'YES') {
			return '.allow(null)'
		} else if (column.isnullable === 'NO') {
			return '.invalid(null)'
		}
	}

]

function lowercaseProperties(obj) {
	var result = {}
	for (var prop in obj) {
		result[prop.toLowerCase()] = obj[prop]
	}
	return result
}

module.exports = function(columns, camelCaseProperties) {
	return 'Joi.object({\n\t' + columns.map(function(column) {
		column = lowercaseProperties(column)
		var property = camelCaseProperties ? toCamelCase(column.columnname) : column.columnname
		return property + ': Joi' + checks.map(function(check) {
			return check(column)
		}).join('')
	}).join(',\n\t') + '\n})'
}
