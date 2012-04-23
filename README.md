# Network Hub for DCPU-16 machines using WebSockets


## About

This is a very simple, even naïve, implementation of a networking hub which
allows DCPU-16 emulators to exchange data.


## Demo

To see the data exchange in action, open
http://manuel.kiessling.net/dcpu16networkdemo/index.html?isSender=1
in your browser. It will display a link to another machine - open this in
another browser window.

Whatever you type in the first window is send to the keyboard ring buffer
of this machine. The running program picks up new data from the buffer,
and echoes it to its console, and puts in on the network wire.

The second machine puts up everything that arrives on the wire and
displays it in its console.


## Caveats

The code is very beta, although some basic sanity and error checkings have
been implemented. The demo uses calculates random network addresses for sender
and receiver - collisions might occur.

The demo uses my own JavaScript emulator, which probably isn't perfect (e.g., it
has an ASCII-only console).


## How it works

From the DCPU-16's point of view, the network wire work similar to the keyboard
ring buffer.

The emulator must establish a WebScokets connection with the hub at
188.40.187.185:80 and register an id between 0x1 and 0xffff.

Once the connection is established, data exchange between the hub and the
machine works as follows:

Whenever the emulator receives a packet from the hub, it writes the id of the
sender to the machines memory at [0x6000+index], and the data to
[0x6000+index+1], and then increases index by 1.
This memory area works as a ring buffer, i.e., after writing to [0x607f],
subsequent writing starts at [0x6000] again.

Whenever the machine writes data between addresses [0x6080] and [0x60ff], the
emulator must pick up this data, interpreting every even field as the hub id of
the receiver, and every uneven field as the payload, i.e., when data is written
to [0x6081], the emulator uses [0x6080] as the hub id, and [0x6081] as the data.

The receiver hub id & data packet is then send to the hub, who delivers it to the emulator
which is connected at the receiver id in question.
