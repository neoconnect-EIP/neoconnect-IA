function getStringRandomness(s) {
	var frequencies, risk;

	frequencies = s.split('').reduce(function(carry, current) {
		carry[current] = (carry[current] || 0) + 1;
		return carry;
	}, new Object(null));

	risk = Object.keys(frequencies).reduce(function(carry, current) {
		var p = frequencies[current] / s.length;
		carry = carry - Math.log(p) / Math.log(2) * p;
		return carry;
	}, 0);

	return risk * 20;
}

module.exports = getStringRandomness;
