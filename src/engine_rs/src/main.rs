use winit::{
    event::{Event, WindowEvent},
    event_loop::{ActiveEventLoop, ControlFlow, EventLoop},
    window::{Window, WindowAttributes},
};

fn main() {
    let event_loop = EventLoop::new().unwrap();
    let window = event_loop
        .create_window(WindowAttributes::default())
        .unwrap();

    event_loop.run
}
