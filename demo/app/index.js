"use strict";

define(['../lib/utility', '../lib/Memory', '../lib/Cpu', './Terminal', './Keyboard', './NetworkInterfaceCard'], function(utility, Memory, Cpu, Terminal, Keyboard, Nic) {

  var cpu;
  var memory;
  var keyboard;
  var terminal;
  var nic;
  var wordsize;
  var numberOfWords;
  var accessedMemoryBlocks = [];
  var runInterval;

  var handleMemoryRead = function(address, value) {
    //accessedMemoryBlocks[address] = value;
  };

  var handleMemoryWrite = function(address, value) {
    accessedMemoryBlocks[address] = value;
    if (address >= 0x8000 && address <= 0x817f) {
      terminal.draw(address, value);
    }
    if (address >= 0x6080 && address <= 0x60ff) {
      nic.handleOutgoing(address);
    }
  };

  var handleCpuStep = function() {
    //
  };

  var updateRegisterAndMemoryInfo = function() {
    //return;
    var text = '';
    var value;
    cpu.registers.forEach(function(registerValue, registerNumber) {
      if (registerValue === null) {
        console.log('rNull' + cpu.registerNames[registerNumber]);
      }
      text += utility.fillString(cpu.registerNames[registerNumber] + ': ', 6, ' ') + utility.pad(registerValue.toString(16), 4) + ' (0b' + utility.pad(registerValue.toString(2), 16) + ', d' + registerValue.toString(10) + ')' + '\n';
    });
    text += utility.fillString('Steps: ', 6, ' ') + utility.pad(cpu.stepNumber, 8) + '\n';
    $("#registervalues").html(text);
    //return;
    text = '';
    var memoryBlockAccessed = false;
    for (var j = 0; j < numberOfWords / 8; j++) {
      for (var i = 0; i < 8; i++) {
        if (accessedMemoryBlocks[(j * 8) + i] !== undefined) {
          memoryBlockAccessed = true;
        }
      }
      if (memoryBlockAccessed) {
        text += '<b>' + utility.pad((j * 8).toString(16), 4) + ': </b>';
        for (var i = 0; i < 8; i++) {
          value = memory.read((j * 8) + i);
          if (cpu.registers[0x1c] === ((j * 8) + i)) {
            text += '<span class="currentinstruction">';
          }
          if (value > 0) {
            text += '<b title="' + '0b' + utility.pad(value.toString(2), 16) + ', d' + value.toString(10) + '">';
          }
          text += utility.pad(value.toString(16), 4);
          if (memory.read((j * 8) + i) > 0) {
            text += '</b>';
          }
          if (cpu.registers[0x1c] === ((j * 8) + i)) {
            text += '</span>';
          }
          text += ' ';
        }
        text += '\n';
      }
      memoryBlockAccessed = false;
    }
    $("#memoryvalues").html(text);
  };

  wordsize = 0xFFFF;
  numberOfWords = 0x10000;

  memory = new Memory(numberOfWords, wordsize, {
    read: handleMemoryRead,
    write: handleMemoryWrite
  });

  keyboard = new Keyboard($('body'), memory);

  var getInstructions = function(element) {
    var text = element.val();
    var lines = text.split('\n');
    var instruction;
    var instructions = [];
    lines.forEach(function(line) {
      line = line.trim();
      instruction = line.substring(0, 6);
      instruction = instruction.toLowerCase();
      if (instruction.substring(2, 1) !== 'x') {
        instruction = instruction.substring(0, 4);
      }
      if (instruction !== '') {
        instructions.push(parseInt(line, 16));
      }
    });
    return instructions;
  };

  var load = function(memory, instructions) {
    var address = 0x0;
    instructions.forEach(function(instruction) {
      memory.write(address, instruction);
      address++;
    });
  };

  var reset = function() {
    keyboard.reset();
    if (cpu !== undefined) {
      cpu.stop();
    }
    memory.reset();
    accessedMemoryBlocks = [];
    $("#registervalues").html('');
    $("#memoryvalues").html('');
    load(memory, getInstructions($('#hexinstructions')));
    cpu = new Cpu(memory, {
      step: handleCpuStep
    });
    updateRegisterAndMemoryInfo();
    terminal = new Terminal($('#consoleoutput'), 0x8000, 12, 32);
  };

  $('#reset').click(function() {
    reset();
  });

  $('#step').click(function() {
    cpu.step();
    updateRegisterAndMemoryInfo();
  });

  $('#run').click(function() {
    runInterval = setInterval(function() {
      updateRegisterAndMemoryInfo();
    }, 1000);
    cpu.run();
  });

  $('#stop').click(function() {
    clearInterval(runInterval);
    if (cpu !== undefined) {
      cpu.stop();
    }
  });

  if (utility.getUrlParameter('isSender', window.location.href) == 1) {
    var hubId = parseInt(Math.random() * 0xffff);
    nic = new Nic(hubId, memory);
    var receiverHubId = parseInt(0x1f + (Math.random() * (0xffff - 0x1f))).toString(16);
    var instructionSet = '8001 8011 8061 8071 816c 9000 7dc1 0004 5811 9000 0501 8000 7d71 6080 xxxx 8472 0571 6080 8472 8161 9000 8402 8462 c06c 8061 7c7c 0080 8071 7dc1 0004'.split(" ");
    instructionSet[14] = receiverHubId;
    $('#hexinstructions').html(instructionSet.join("\n"));
    $('#receivernote').html('Type messages in this window. Open <a href="/index.html?hubId=' + parseInt(receiverHubId, 16) + '" target="_blank">the receiver machine</a> in another window to see how messages are received.');
    reset();
    runInterval = setInterval(function() {
      updateRegisterAndMemoryInfo();
    }, 1000);
    cpu.run();
  } else {
    nic = new Nic(utility.getUrlParameter('hubId', window.location.href), memory);
    reset();
    runInterval = setInterval(function() {
      updateRegisterAndMemoryInfo();
    }, 1000);
    cpu.run();
  }

});
