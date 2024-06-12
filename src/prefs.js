import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import { ExtensionPreferences, gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class TransparentWindowMovingPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: _("Transparent Window Moving"),
        });
        group.add(this.buildPrefsWidget());
        page.add(group);
        window.add(page);
    }

    buildPrefsWidget() {
        let settings = this.getSettings();
        let box = new Gtk.ListBox({
            cssClasses: ["boxed-list"],
        });

        box.append(this.buildSpin(settings, "window-opacity", [0, 255, 5, 50, 0], _("Opacity (0..255)")));
        box.append(this.buildSpin(settings, "transition-time", [0, 1, 0.1, 0, 2], _("Animation time")));
        box.append(this.buildSwitcher(settings, "transparent-on-moving", _("Transparent on moving")));
        box.append(this.buildSwitcher(settings, "transparent-on-resizing", _("Transparent on resizing")));

        return box;
    }

    buildSwitcher(settings, key, title) {
        const switcher = new Adw.SwitchRow({
            title: title,
        });

        settings.bind(key, switcher, "active", Gio.SettingsBindFlags.DEFAULT);

        return switcher;
    }

    buildSpin(settings, key, values, title) {
        const [lower, upper, step, page, digits] = values;

        const adjustment = new Gtk.Adjustment({
            lower: lower,
            upper: upper,
            step_increment: step,
            page_increment: page,
        });
        const spin = new Adw.SpinRow({
            title: title,
            digits: digits,
            adjustment: adjustment,
        });

        settings.bind(key, spin, "value", Gio.SettingsBindFlags.DEFAULT);

        return spin;
    }
}
