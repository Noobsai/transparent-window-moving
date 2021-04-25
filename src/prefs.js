// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;

let _settings;

function init() {
	_settings = ExtensionUtils.getSettings();
	ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
	let box = new Gtk.Box({
		halign: Gtk.Align.CENTER,
		orientation: Gtk.Orientation.VERTICAL,
		'margin-top': 20,
		'margin-bottom': 20,
		'margin-start': 20,
		'margin-end': 20,
		spacing: 16
	});

	box.append(buildSpin('window-opacity', [0, 255, 5, 50, 0], _("Opacity (0..255):")));
	box.append(buildSpin('transition-time', [0, 1, 0.1, 0, 2], _("Animation time:")));
	box.append(buildSwitcher('transparent-on-moving', _("Transparent on moving:")));
	box.append(buildSwitcher('transparent-on-resizing', _("Transparent on resizing:")));

	return box;
}

function buildSwitcher(key, labeltext) {
	let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext });

	let switcher = new Gtk.Switch();

	_settings.bind(key, switcher, 'active', Gio.SettingsBindFlags.DEFAULT);

	hbox.append(label);
	hbox.append(switcher);

	return hbox;
}

function buildSpin(key, values, labeltext) {
	let [lower, upper, step, page, digits] = values;
	let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext });

	let spin = new Gtk.SpinButton({
		digits: digits,
		adjustment: new Gtk.Adjustment({
			lower: lower,
			upper: upper,
			step_increment: step,
			page_increment: page
		})
	});

	_settings.bind(key, spin, 'value', Gio.SettingsBindFlags.DEFAULT);

	hbox.append(label);
	hbox.append(spin);
	
	return hbox;
};
