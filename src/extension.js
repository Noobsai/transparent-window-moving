const Clutter = imports.gi.Clutter;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;

let _settings = null;
let _window_opacity;

let _on_window_grab_begin, _on_window_grab_end;
let _on_move_changed, _on_resize_changed;

let _allowed_grab_operations = [];
let _grab_moving_operations = [
	Meta.GrabOp.MOVING,
	Meta.GrabOp.KEYBOARD_MOVING
];

let _grab_resizing_operations = [
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

function init_grab_operations() {
	_allowed_grab_operations = [];
	if (_settings.get_boolean('transparent-on-moving')) {
		_allowed_grab_operations.push(..._grab_moving_operations);
	}

	if (_settings.get_boolean('transparent-on-resizing')) {
		_allowed_grab_operations.push(..._grab_resizing_operations);
	}
}

function is_grab_operation_allowed(grab_op) {
	return _allowed_grab_operations.indexOf(grab_op) > -1;
}

function set_opacity(window_surfaces, target_opacity, on_complete) {
	let complete_func = function() {
		if (on_complete) {
			on_complete();
		}
	};

	let transition_time = _settings.get_double('transition-time');
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

function get_window_surfaces(meta_window) {
	let window_actor = meta_window.get_compositor_private();
	let childs = window_actor.get_children();
	let surfaces = childs.filter(child => child.constructor.name.indexOf('MetaSurfaceActor') > -1);
	if (surfaces.length > 0) {
		return surfaces;
	}

	return [window_actor];
}

function window_grab_begin(meta_display, meta_window, meta_grab_op, gpointer) {
	if (!meta_window || !is_grab_operation_allowed(meta_grab_op)) {
		return;
	}

	let window_surfaces = get_window_surfaces(meta_window);
	let pid = meta_window.get_pid();
	if (!_window_opacity[pid]) {
		_window_opacity[pid] = window_surfaces[0].opacity;
	}

	let opacity_value = _settings.get_int('window-opacity');
	set_opacity(window_surfaces, opacity_value);
}

function window_grab_end(meta_display, meta_window, meta_grab_op, gpointer) {
	if (!meta_window || !is_grab_operation_allowed(meta_grab_op)) {
		return;
	}

	let window_surfaces = get_window_surfaces(meta_window);
	let pid = meta_window.get_pid();

	set_opacity(window_surfaces, _window_opacity[pid], function() { delete _window_opacity[pid]; });
}

function enable() {
	_settings = ExtensionUtils.getSettings();
	init_grab_operations();
	_window_opacity = {};
	_on_window_grab_begin = global.display.connect('grab-op-begin', window_grab_begin);
	_on_window_grab_end = global.display.connect('grab-op-end', window_grab_end);
	_on_move_changed = _settings.connect('changed::transparent-on-moving', init_grab_operations);
	_on_resize_changed = _settings.connect('changed::transparent-on-resizing', init_grab_operations);
}

function disable() {
	global.display.disconnect(_on_window_grab_begin);
	global.display.disconnect(_on_window_grab_end);
	_settings.disconnect(_on_move_changed);
	_settings.disconnect(_on_resize_changed);

	_window_opacity = {};
	_settings.run_dispose();
}

function init() {
	ExtensionUtils.initTranslations();
}