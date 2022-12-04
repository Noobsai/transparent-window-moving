'use strict';

const Clutter = imports.gi.Clutter;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;

const _grab_moving_operations = [
	Meta.GrabOp.MOVING,
	Meta.GrabOp.KEYBOARD_MOVING
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

class Extension {
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
		const pid = meta_window.get_pid();
		if (!this._window_opacity[pid]) {
			this._window_opacity[pid] = window_surfaces[0].opacity;
		}
	
		const opacity_value = this._settings.get_int('window-opacity');
		this.set_opacity(window_surfaces, opacity_value);
	}
	
	window_grab_end(meta_display, meta_window, meta_grab_op, gpointer) {
		if (!meta_window || !this.is_grab_operation_allowed(meta_grab_op)) {
			return;
		}
	
		const window_surfaces = this.get_window_surfaces(meta_window);
		const pid = meta_window.get_pid();

		const complete_func = function() {
			delete this._window_opacity[pid];
		};
	
		this.set_opacity(window_surfaces, this._window_opacity[pid], complete_func.bind(this));
	}

	enable() {
		this._settings = ExtensionUtils.getSettings();
		this.init_grab_operations();
		this._window_opacity = {};
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
	
		delete this._window_opacity;
		delete this._allowed_grab_operations;
		this._settings.run_dispose();
		delete this._settings;
	}
}

function init() {
	return new Extension();
}