import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ }
    from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class TransparentWindowMovingPreferences
	extends ExtensionPreferences {

	fillPreferencesWindow(window) {
		const page = new Adw.PreferencesPage();
		const group = new Adw.PreferencesGroup({
			title: _('Transparent Window Moving'),
		});
		group.add(this.buildPrefsWidget())
		page.add(group);
		window.add(page);
	}

    buildPrefsWidget() {
        let settings = this.getSettings();
        let box = new Gtk.Box({
            halign: Gtk.Align.CENTER,
            orientation: Gtk.Orientation.VERTICAL,
            'margin-top': 20,
            'margin-bottom': 20,
            'margin-start': 20,
            'margin-end': 20,
            spacing: 16
        });

        box.append(this.buildSpin(settings, 'window-opacity', [0, 255, 5, 50, 0], _('Opacity (0..255):')));
        box.append(this.buildSpin(settings, 'transition-time', [0, 1, 0.1, 0, 2], _('Animation time:')));
        box.append(this.buildSwitcher(settings, 'transparent-on-moving', _('Transparent on moving:')));
        box.append(this.buildSwitcher(settings, 'transparent-on-resizing', _('Transparent on resizing:')));

        return box;
    }

    buildSwitcher(settings, key, labeltext) {
        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

        let label = new Gtk.Label({ label: labeltext });

        let switcher = new Gtk.Switch();

        settings.bind(key, switcher, 'active', Gio.SettingsBindFlags.DEFAULT);

        hbox.append(label);
        hbox.append(switcher);

        return hbox;
    }

    buildSpin(settings, key, values, labeltext) {
        let [lower, upper, step, page, digits] = values;
        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

        let label = new Gtk.Label({ label: labeltext });

        let spin = new Gtk.SpinButton({
            digits: digits,
            adjustment: new Gtk.Adjustment({
                lower: lower,
                upper: upper,
                step_increment: step,
                page_increment: page
            })
        });

        settings.bind(key, spin, 'value', Gio.SettingsBindFlags.DEFAULT);

        hbox.append(label);
        hbox.append(spin);

        return hbox;
    };
}
