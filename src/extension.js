import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';

import { Extension, gettext as _ }
	from 'resource:///org/gnome/shell/extensions/extension.js';

const _grab_moving_operations = [
	Meta.GrabOp.MOVING,
	Meta.GrabOp.KEYBOARD_MOVING,
	Meta.GrabOp.MOVING_UNCONSTRAINED
];

const _grab_resizing_operations = [
	Meta.GrabOp.RESIZING_NW,
	Meta.GrabOp.RESIZING_N,
	Meta.GrabOp.RESIZING_NE,
	Meta.GrabOp.RESIZING_E,
	Meta.GrabOp.RESIZING_SW,
	Meta.GrabOp.RESIZING_S,
	Meta.GrabOp.RESIZING_SE,
	Meta.GrabOp.RESIZING_W,
	Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN,
	Meta.GrabOp.KEYBOARD_RESIZING_NW,
	Meta.GrabOp.KEYBOARD_RESIZING_N,
	Meta.GrabOp.KEYBOARD_RESIZING_NE,
	Meta.GrabOp.KEYBOARD_RESIZING_E,
	Meta.GrabOp.KEYBOARD_RESIZING_SW,
	Meta.GrabOp.KEYBOARD_RESIZING_S,
	Meta.GrabOp.KEYBOARD_RESIZING_SE,
	Meta.GrabOp.KEYBOARD_RESIZING_W
];

export default class TransparentWindowMoving extends Extension {
	init_grab_operations() {
		this._allowed_grab_operations = [];
		if (this._settings.get_boolean('transparent-on-moving')) {
			this._allowed_grab_operations.push(..._grab_moving_operations);
		}
	
		if (this._settings.get_boolean('transparent-on-resizing')) {
			this._allowed_grab_operations.push(..._grab_resizing_operations);
		}
	}
	
	is_grab_operation_allowed(grab_op) {
		return this._allowed_grab_operations.indexOf(grab_op) > -1;
	}
	
	set_opacity(window_surfaces, target_opacity, on_complete) {
		const complete_func = function() {
			if (on_complete) {
				on_complete();
			}
		};
	
		const transition_time = this._settings.get_double('transition-time');
		if (transition_time < 0.001) {
			window_surfaces.forEach(surface => {
				surface.opacity = target_opacity;
			});
			complete_func();
		} else {
			window_surfaces.forEach(surface => {
				surface.ease({
					duration: transition_time * 1000,
					mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					opacity: target_opacity,
					onComplete: complete_func
				});
			});
		}
	}
	
	get_window_surfaces(meta_window) {
		const window_actor = meta_window.get_compositor_private();
		const surfaces = this.find_meta_surface_actors(window_actor);
		if (surfaces.length > 0) {
			return surfaces;
		}
	
		return [window_actor];
	}

	find_meta_surface_actors(meta_actor) {
		if (meta_actor.constructor.name.indexOf('MetaSurfaceActor') > -1) {
			return [meta_actor];
		}
		
		const surfaces = [];
		for (const child of meta_actor.get_children()) {
			const result = this.find_meta_surface_actors(child);
			if (result.length > 0) {
				surfaces.push(...result);
			}
		}

		return surfaces;
	}
	
	window_grab_begin(meta_display, meta_window, meta_grab_op, gpointer) {
		if (!meta_window || !this.is_grab_operation_allowed(meta_grab_op)) {
			return;
		}
	
		const window_surfaces = this.get_window_surfaces(meta_window);
		const opacity_value = this._settings.get_int('window-opacity');
		// Track per window, not per PID: apps like Firefox share one PID across windows.
		if (!this._window_opacity.has(meta_window)) {
			let original = window_surfaces[0].opacity;
			// A window already left at our transparency value was stuck by an earlier bug; heal it.
			if (original === opacity_value) {
				original = 255;
			}
			this._window_opacity.set(meta_window, original);
		}
	
		this.set_opacity(window_surfaces, opacity_value);
	}
	
	window_grab_end(meta_display, meta_window, meta_grab_op, gpointer) {
		// Restore any window we made transparent, even if the end op differs from the begin op
		// (tiling extensions can change it mid-grab).
		if (!meta_window || !this._window_opacity.has(meta_window)) {
			return;
		}
	
		const original = this._window_opacity.get(meta_window);
		// Forget it now rather than on animation completion, so a new grab starting
		// during the fade-in can't lose the stored value.
		this._window_opacity.delete(meta_window);
		this.set_opacity(this.get_window_surfaces(meta_window), original);
	}

	enable() {
		this._settings = this.getSettings();
		this.init_grab_operations();
		this._window_opacity = new Map();
		this._on_window_grab_begin = global.display.connect('grab-op-begin', this.window_grab_begin.bind(this));
		this._on_window_grab_end = global.display.connect('grab-op-end', this.window_grab_end.bind(this));
		this._on_move_changed = this._settings.connect('changed::transparent-on-moving', this.init_grab_operations.bind(this));
		this._on_resize_changed = this._settings.connect('changed::transparent-on-resizing', this.init_grab_operations.bind(this));
	}

	disable() {
		global.display.disconnect(this._on_window_grab_begin);
		global.display.disconnect(this._on_window_grab_end);
		this._settings.disconnect(this._on_move_changed);
		this._settings.disconnect(this._on_resize_changed);
	
		for (const [meta_window, original] of this._window_opacity) {
			if (meta_window.get_compositor_private()) {
				this.get_window_surfaces(meta_window).forEach(surface => {
					surface.remove_all_transitions();
					surface.opacity = original;
				});
			}
		}
		delete this._window_opacity;
		delete this._allowed_grab_operations;
		delete this._settings;
		delete this._on_window_grab_begin;
		delete this._on_window_grab_end;
		delete this._on_move_changed;
		delete this._on_resize_changed;
	}
}
