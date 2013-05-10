
// this checks the selector string, parses it
// and identifies the object type and the object's id

exports.parse_selector = function (s) {
	var r = { type: null, id: null }; // return structure

	var instance_re = /^\s*(i-[0-9a-fA-F]{8})\s*$/;
	var volume_re   = /^\s*(vol-[0-9a-fA-F]{8})\s*$/;
	var ip_re       = /^\s*(\d+\.\d+\.\d+.\d+)\s*$/;
	var match = s.match(instance_re);
	if (match) {
		r.type = 'instance';
		r.id   = match[0];
		return r;
	}
	match = s.match(volume_re);
	if (match) {
		r.type = 'volume';
		r.id   = match[0];
		return r;
	}
	match = s.match(ip_re);
	if (match) {
		r.type = 'ip';
		r.id   = match[0];
		return r;
	}
	// none of the above
	return null;
}
