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

__Note:__ Looks like there is currently a problem with the demo, I'm looking into it.


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
[0x6000+index+1], and then increases index by 2.
This memory area works as a ring buffer, i.e., after writing to [0x607f],
subsequent writing starts at [0x6000] again.

Whenever the machine writes data between addresses [0x6080] and [0x60ff], the
emulator must pick up this data, interpreting every even field as the hub id of
the receiver, and every uneven field as the payload, i.e., when data is written
to [0x6081], the emulator uses [0x6080] as the hub id, and [0x6081] as the data
.

The receiver hub id & data packet is then send to the hub, who delivers it to
the emulator which is connected at the receiver id in question.

Currently, the is basically no security whatsoever, however, you use hub
connections that are already in use.

## Example code / How to use it

If you want to use make use of the network from your DCPU-16 machine, you must
extend your emulator, that is, you must write a virtual Network Interface card
that is able to register with the hub, read memory data that is written to
[0x6080]-[0x60ff] and send it to the hub, and handles incoming hub data by
writing it to [0x6000]-[0x607f].

This virtual NIC must speak the WebSockets protocol to connect to the hub. This
is relatively simple in JavaScript using Socket.io, but should be doable in
other emulator implementations, too.

An example NIC can be found at:
https://github.com/ManuelKiessling/jsDCPU16/blob/2f62c17a3d0ec1cf7a9e816a4924213882c35e71/app/NetworkInterfaceCard.js#L1

This is an example DCPU-16 assembler application that sends every keyboard input
to hub id 2:

    SET A, 0 ; terminal index
    SET B, 0
    SET I, 0 ; keyboard index
    SET J, 0 ; network index
    :loop
    IFE [0x9000+I], 0
     SET PC, loop
    SET B, [0x9000+I]
    SET [0x8000+A], B ; write to terminal
    SET [0x6080+J], 6500 ; receiver hub id
    ADD J, 1
    SET [0x6080+J], B ; set network data
    ADD J, 1
    SET [0x9000+I], 0
    ADD A, 1
    ADD I, 1
    IFE I, 16 ; cycle keyboard index
     SET I, 0
    IFE J, 128 ; cycle network index
     SET J, 0
    SET PC, loop

And this is an example application that echoes everything which is received on
the network to the console:

    SET A, 0
    SET B, 0
    SET I, 0
    :loop
    IFE [0x6001+I], 0
     SET PC, loop
    SET B, [0x6001+I]
    SET [0x8000+A], B
    SET [0x6000+I], 0
    SET [0x6001+I], 0
    ADD I, 2
    ADD A, 1
    IFE I, 128
     SET I, 0
    SET PC, loop

Feel free to use ws://188.40.187.185:80/ as the hub for you emulator Network Interface Card.

## Get in touch

Find me on Twitter as [@manuelkiessling](https://twitter.com/manuelkiessling)
or send me an email at [manuel@kiessling.net](mailto:manuel@kiessling.net)
