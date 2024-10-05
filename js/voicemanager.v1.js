// v1 : Audition only


// ==========================================================
// Global Variable declarations
const DEBUG = true;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 16 bit, 24kHz, Mono
const WAVMONO  = "57415645666D7420100000000100010044AC000010B102000200100064617461"
// 16 bit, 24kHz, Stereo
const WAVSTEREO ="57415645666D7420100000000100020044AC000010B102000400100064617461"

const CORRECTION = "048C048C048C048C0C840C840C840C84048CE26A048CE26A0C84EA620C84EA62048C048CC048C0480C840C84C840C840048CE26AC048AE260C84EA62C840A62E0C840C840C840C848C048C048C048C040C84EA620C84EA628C046AE28C046AE20C840C84C840C8408C048C0448C048C00C84EA62C840A62E8C046AE248C026AE159DF37B159DF37B1D95FB731D95FB73F37BF37BF37BF37BFB73FB73FB73FB73159DF37BD159BF371D95FB73D951B73FF37BF37BBF37BF37FB73FB73B73FB73F1D95FB731D95FB739D157BF39D157BF3FB73FB73FB73FB737BF37BF37BF37BF31D95FB73D951B73F9D157BF359D137BFFB73FB73B73FB73F7BF37BF337BF37BF26AE26AEE26AE26A2EA62EA6EA62EA6226AE048CE26AC0482EA60C84EA62C840E26AE26AE26AE26AEA62EA62EA62EA62E26AC048E26AC048EA62C840EA62C8402EA62EA6EA62EA62AE26AE266AE26AE22EA60C84EA62C840AE268C046AE248C0EA62EA62EA62EA626AE26AE26AE26AE2EA62C840EA62C8406AE248C06AE248C037BF159DF37BD1593FB71D95FB73D951159D159DD159D1591D951D95D951D951F37BD159F37BD159FB73D951FB73D951D159D159D159D159D951D951D951D9513FB71D95FB73D951BF379D157BF359D11D951D95D951D9519D159D1559D159D1FB73D951FB73D9517BF359D17BF359D1D951D951D951D95159D159D159D159D1"

const MAXFILESIZE = 2739296;

// __________________________________________________________
// A FileReader object to allow us to load files
const reader = new FileReader();

// __________________________________________________________
// The data array area for the individual sound files
// these are loaded as WAV files. 
const dataWAV = new Array(16);

for (let i =0; i<dataWAV.length; i++) {
		dataWAV[i] = new ArrayBuffer();
}

// Number of currently occupied slots
let numberLoaded = 0;

// __________________________________________________________
// Global name of input file (TNW or WAV) just for populating text fields
const inputFile = "";

// __________________________________________________________
// The data areas for the TNW file
let dataTNW = new ArrayBuffer();

let filenameTNW = "";

let headerTNW = new ArrayBuffer();

// __________________________________________________________
// Array of all the individual load/play/save/dead buttons
const load = document.querySelectorAll("button.load");
const play = document.querySelectorAll("button.play");
const save = document.querySelectorAll("button.save");
const dead = document.querySelectorAll("button.dead");

// ==========================================================
// Functions

// __________________________________________________________
// Utility functions
function buf2hex(buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
}

function hex2buf(string) {
    const uint8array = new Uint8Array(Math.ceil(string.length / 2));
    for (let i = 0; i < string.length;)
        uint8array[i / 2] = Number.parseInt(string.slice(i, i += 2), 16);
    return uint8array;
}

function memcpy (src, srcOffset, dst, dstOffset, length) {
    var i

    src = src.subarray || src.slice ? src : src.buffer
    dst = dst.subarray || dst.slice ? dst : dst.buffer

    src = srcOffset ? src.subarray ?
        src.subarray(srcOffset, length && srcOffset + length) :
        src.slice(srcOffset, length && srcOffset + length) : src

    if (dst.set) {
        dst.set(src, dstOffset)
    } else {
        for (i=0; i<src.length; i++) {
            dst[i + dstOffset] = src[i]
        }
    }

    return dst
}
// __________________________________________________________
// Decode the TNW word into a WAV word or vice versa
function fnDecode(wordin) {
	let in1 = (wordin & 0xF000) >> 12;
	let in2 = (wordin & 0x0F00) >> 8;
	let in3 = (wordin & 0x00F0) >> 4;
	let in4 = (wordin & 0x000F)     ;
	
	let ci = 64*(in3 & 12)+ 32*(in4 & 7) + 4*(in1 & 7) + (in2 & 3);
	let c1 = Number("0x"+CORRECTION[ci]);
	let out1 = (in4 + in1 + c1) & 0xF;
	return ((out1<<12) + (in2<<8) + (in3<<4) + in4);
}

// __________________________________________________________

// Function to download data to a file
function fnSaveAs(data, filename) {
	if (DEBUG) {console.log("fnSaveAs "+filename);}
	let file = new Blob([data], {"type":"application/octet-stream"});
	saveAs(file,filename);	 	// FileSaver method
	return;
}

// __________________________________________________________
// Fetch the TNW header for later use
async function fnFetchHeader() {
	const url = "/data/header.tnw";
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		headerTNW = await response.arrayBuffer();
		console.log(headerTNW);
	} catch (error) {
		console.error(error.message);
	}
}

// __________________________________________________________
// Loading a WAV file

function fnLoadWav(e) {
	// get the ID number
	if (DEBUG) {console.log("fnLoadWav"+e.id);}
	const n = e.id.substr(4,2);
	
	// Create and launch the handler
	let input = document.createElement('input');
    input.type = 'file';
	input.accept = ".wav";
	input.onchange = () => {
		fnWavInput(n, input.files[0]);
	};
	input.click();
}

// Converts Uint32 to string
function fnChunkName(a) {
	return String.fromCharCode(a>>24,(a>>16)&0xFF,(a>>8)&0xFF, a&0xFF);
}

// Checks the format
// ab is an arraybuffer
function fnWavCheck(ab) {
	if (DEBUG)  {console.log("fnWavCheck");}
	
	if (ab.byteLength == 0) {
		console.log("Buffer is empty");
		return;
	}
	
	if (ab.bytelength < 44) {
		console.log("Buffer is too short");
		return;
	}
	// Byte version
	let wavView = new DataView(ab);

	// Check first header
	let temp = wavView.getUint32(0,false);
	if ( fnChunkName(temp) != "RIFF" ) { console.log("ChunkID is not RIFF");}
	temp = wavView.getUint32(8,false);
	if ( fnChunkName(temp) != "WAVE" ) { console.log("Format field is not WAVE");}
	let dataptr = 12;		// the dataptr to the first header

	let audioformat = 0;
	let channels = 0;
	let rate = 0;
	let bits = 0;
	let audiostart = 0;
	let audiolength = 0;
	
	while (dataptr<ab.byteLength) {		
		temp = wavView.getUint32(dataptr,false);
		if ( fnChunkName(temp) == "fmt " ) { 
			console.log("SubchunkID is fmt");
			audioformat = wavView.getUint16(dataptr+8,true);	// PCM=1
			channels = wavView.getUint16(dataptr+10,true);	// mono or stereo
			rate = wavView.getUint32(dataptr+12,true);		// 
			bits = wavView.getUint16(dataptr+22,true);
			// jump to next chunk
			dataptr += wavView.getUint32(dataptr+4,true) + 8;
		} else if ( fnChunkName(temp) == "data" ) {
			console.log("SubchunkID is data");
			audiolength = wavView.getUint32(dataptr+4, true);	// reported length
			audiostart = dataptr+8;
			// check that this doesn't go beyond the file!
			if (audiolength+dataptr+8 > ab.byteLength) {
				let truelength = ab.byteLength-dataptr-8;
				console.log("Reported length <"+audiolength+"> is not the actual length <"+truelength+">");
				console.log("Truncating...");
				wavView.setUint32(dataptr+4,truelength,true);
			}
			// jump to next chunk
			dataptr += wavView.getUint32(dataptr+4,true) + 8;
		} else {
			console.log("Unrecognized subchunk : "+ fnChunkName(temp) );
			// remove the chunk
			let chunklen = wavView.getUint32(dataptr+4,true)+8;
			console.log("removing : "+ chunklen + " from "+ab.byteLength );
			//ab = ab.splice(dataptr,chunklen);
			console.log ("now = "+ab.byteLength);
		}
	}
	
	// Truncate the WAV file to 171168 = 0x29CA0 bytes (TNR max)
	let maxwav = 171168;
	
	if (audiolength>maxwav) {
		console.log("Truncating WAV file from "+audiolength);
		//ab.splice(audiostart+maxwav,audiolength-maxwav);
		wavView.setUint32(autiostart-4,maxwav, true);
		audiolength = maxwav;
	}
		
			
	
			
	if (DEBUG) {
		console.log("  PCM:" + audioformat);
		console.log("  M/S:" + channels);
		console.log("  Rate:" + rate);
		console.log("  bits:" + bits);
		console.log("  start:" + audiostart);
		console.log("  length:" + audiolength);
	}
	
	return;

}		



function fnWavInput(n, inputFile) {
	
	if (DEBUG) {console.log("fnWavInput",n, inputFile);}
	
	// Check for non-zero
	if (inputFile.name=="") {
		window.alert("No File");
		return;
	}
	
	// Check for extension
	if ( inputFile.name.split('.').pop() != "wav" ) {
		window.alert("Only WAV files can be loaded at present");
		return;
	}
			
	// Read the data now using FileReader. 
	
	reader.onload = function() {
		if (DEBUG) {console.log(reader.result);}
		dataWAV[n-1]=reader.result;
		
		fnWavCheck(dataWAV[n-1]);
		
		// console.log(buf2hex(r.result));

		// Check if we are adding a new one
		if (document.getElementById("play"+n).disabled == true) {
			numberLoaded = numberLoaded+1;
		}
		if (DEBUG) {console.log(numberLoaded);}

		// Add into the name
		document.getElementById("file"+n).textContent = inputFile.name.split('.')[0];

		// enable all the other ones
		document.getElementById("play"+n).disabled = false;
		document.getElementById("save"+n).disabled = false;
		document.getElementById("dead"+n).disabled = false;
	
		// Enable the saveTnw button
		document.getElementById("saveTnw").disabled = true;


	};
	reader.onerror = function() {
		window.alert("Couldn't load File");
		if (DEBUG) {console.log(reader.error);}
		
	};
	
	// Limit the file size to 171052 bytes (2s)
	// Limit the file size to the max size of the TNR file (!)
	const blob = inputFile.slice(0, MAXFILESIZE);
	reader.readAsArrayBuffer(blob);

}

// __________________________________________________________
// Playing a WAV file
function fnPlayWav(e) {
	if (DEBUG) {console.log("fnPlayWav"+e.id);}

	// get the ID number
	const n = e.id.substr(4,2);

	// play the file
	audioCtx.resume();
	const a = dataWAV[n-1].slice(0);	// Copy to avoid the buffer detaching
	audioCtx.decodeAudioData(a).then(function(buffer) {		
		let soundSource = audioCtx.createBufferSource();
		soundSource.buffer = buffer;
		soundSource.connect(audioCtx.destination);
		if (DEBUG) {console.log("Playing");}
		soundSource.start(0);
	});

}

// __________________________________________________________
// Saveing a WAV file
function fnSaveWav(e) {
	if (DEBUG) {console.log("fnSaveWav"+e.id);}
	let filename = prompt("Enter the file name to save as.");
	if (filename) {
		// get the ID number
		const n = e.id.substr(4,2);
		fnSaveAs(dataWAV[n-1],filename);
	}
}

// __________________________________________________________
// Removing a WAV file
function fnDeadWav(e) {
	if (DEBUG) {console.log("fnDeadWav"+e.id);}
	// get the ID number
	const n = e.id.substr(4,2);
	
	// Clear the name
	document.getElementById("file"+n).textContent = "Not Loaded";

	// Disable the relevant buttons
	document.getElementById("play"+n).disabled = true;
	document.getElementById("save"+n).disabled = true;
	document.getElementById("dead"+n).disabled = true;
	
	// Clear the slot
	dataWAV[n-1].length = 0;
	
	// If all are dead, disable the Save TNW button
	if (numberLoaded > 0) {
		numberLoaded = numberLoaded - 1;
	}
	if (numberLoaded == 0) {
		document.getElementById("saveTnw").disabled = true;
	}
	if (DEBUG) {console.log(numberLoaded);}

}


// __________________________________________________________
// Generating and Saving a TNW file
function fnSaveTnw() {
	if (DEBUG) {console.log("fnSaveTNW",headerTNW.byteLength);}

	// Check the header from the server
	if (headerTNW.byteLength != 0x860) {
		if (DEBUG) {console.log("Header file not retrieved correctly");}
		window.alert("TNW header file not retrieved correctly from website");
		return;
	}
	
	// Copy the header into the TNW data buffer
	new Uint8Array(dataTNW,0,headerTNW.byteLength).set(new Uint8Array(headerTNW),0);


	let view = new DataView(dataTNW);
	
	// Go through each of the slots from the start
	let audioPointerByte = 0x860;	// cumulative audio pointer
	let audioPointerOff  = 0;		// cumulative audio pointer in blocks of 0x20 bytes
	for (let i =0; i<dataWAV.length; i++) {
		// get the amount of audio data we actually have
		
		
		// Assemble the L and R decoded audio from the WAV file
		// just a
		let outdata = new ArrayBuffer();
		let left = new ArrayBuffer();
		
		// L channel : write the slot start and length
		let temp = 0x3AE + (i*30);	// 30 bytes per slot descriptor
		
		

	}
		
	
	//fnSaveAs(data[16],"Testing.TNW");
}

// __________________________________________________________
// Loading and unpacking a TNW file
function fnLoadTnw() {
	if (DEBUG) {console.log("fnLoadTNW");}
	
	// Create and launch the handler
	let input = document.createElement('input');
    input.type = 'file';
	input.accept = ".TNW";
	input.onchange = () => {
		fnTnwInput(input.files[0]);
	};
	input.click();
}


function fnTnwInput(inputFile) {
	if (DEBUG) {console.log("fnTnwInput",inputFile);}

	// Check for non-zero
	if (inputFile.name=="") {
		window.alert("No File");
		return;
	}
	
	// Check for extension
	if ( inputFile.name.split('.').pop().toUpperCase() != "TNW" ) {
		window.alert("Only TNW files can be loaded at present");
		return;
	}
	
	filenameTNW = inputFile.name.split('.')[0];
			
	
	// Load the whole thing into a maximally sized input buffer
	reader.onload = function() {
		if (DEBUG) {console.log(reader.result);}
		dataTNW=reader.result;
		// console.log(buf2hex(r.result));
		fnTnwParse();

		// Add into the name
		// document.getElementById("file"+n).textContent = inputFile.name;

		// enable the TNW save if it isn't already
		document.getElementById("saveTnw").disabled = true;

	};
	reader.onerror = function() {
		window.alert("Couldn't load File");
		console.log(reader.error);		
	};
	
	// Limit the file size to the maximum file size of a TNW file
	const blob = inputFile.slice(0, MAXFILESIZE);
	reader.readAsArrayBuffer(blob);
}

// This function parses the TNW file into their originating 
// WAV files
function fnTnwParse() {
		if (DEBUG) {console.log("fnTnwParse");}
		
		// Disable the buttons just in case the slot loading fails
		numberLoaded = 0;
		for (let i=0; i<16; i++) {
			let n=i+1;
			document.getElementById("play"+n).disabled = true;
			document.getElementById("save"+n).disabled = true;
			document.getElementById("dead"+n).disabled = true;
			document.getElementById("file"+n).textContent = "Not Loaded";

		}	



		// Need to use Dataview in order to be sure about the endianness
		const tnwView = new DataView(dataTNW);
		
		// Byte count pointer in file
		let bytePointer = 0x3AE;
		
		let sampleStartL = []; 	// start position for the L samples
		let sampleStartR = [];  // start position for the R samples
		let sampleLength = [];
		
		// Get the sample lengths in the slots and allocate
		// the start positions for the left and right channels
		// Left slots first
		for (let i=0; i<16; i++) {
			let length = tnwView.getUint16(bytePointer, true);	// little endian
			//console.log(i,length);
			length = length * 0x20 + 0x860;
			sampleStartL.push(length);
			bytePointer += 4;
			length = tnwView.getUint16(bytePointer, true);
			sampleLength.push(length);
			//console.log(i,length);
			bytePointer += 26;
		}
		
		bytePointer = 0x61E;
		for (let i=0; i<16; i++) {
			let length = tnwView.getUint16(bytePointer, true);	// little endian
			//console.log(i,length);
			length = length * 0x20 + 0x860;
			sampleStartR.push(length);
			bytePointer += 4;
			length = tnwView.getUint16(bytePointer, true);
			// Check the length is correct
			if (length === 0) {
				// nothing
			} else if ( length !== sampleLength[i] ) {
				console.log("Length mismatch in samples in slot ",i);
				sampleLength[i] = 0;
			} else {
				length = length * 0x20;
				sampleLength[i] = length;
			}
			//console.log(i,length);
			bytePointer += 26;
		}
		
		// Now convert the samples into WAV files
		// and generate the header
		for (let i=0; i<16; i++) {
			let slength = sampleLength[i]
			if (slength === 0) {
				dataWAV[i].length = 0;
				continue;
			}

			numberLoaded++;
			
			let lstart = sampleStartL[i];
			let rstart = sampleStartR[i];
			// console.log(lstart,rstart,slength);
			// Generate a new array buffer of suitable length
			let filelength = 44 + slength;
			if (lstart !== rstart) {
				// stereo
				filelength = filelength + slength;
			}
			let wavData = new ArrayBuffer(filelength);
			let wavView = new DataView(wavData);
			wavView.setUint32(0,0x52494646,false);	// "RIFF"
			wavView.setUint32(4,filelength,true);		// file length
			if (lstart === rstart) {	// mono
				new Uint8Array(wavData,0,wavData.byteLength).set(new Uint8Array(hex2buf(WAVMONO)),8);
				wavView.setUint32(40,slength,true);		// sample length
			} else {	// stereo
				new Uint8Array(wavData,0,wavData.byteLength).set(new Uint8Array(hex2buf(WAVSTEREO)),8);
				wavView.setUint32(40,2*slength,true);		// sample length
			}
			// Now we read the TNW data, converting the bytes and interleaving the data in the WAV file if required
			let wavPointer = 44;	// WAV file write pointer
			for (let j=0; j<slength ; j+=2) {
				let wordin = tnwView.getUint16(lstart+j, true);
				let wordout = fnDecode(wordin);
				wavView.setUint16(wavPointer,wordout, true);

				wavPointer += 2;
				if (lstart !== rstart) {	// stereo
					wordin = tnwView.getUint16(rstart+j, true);
					wordout = fnDecode(wordin);
					wavView.setUint16(wavPointer,wordout, true);
					wavPointer += 2;
				}
			}
			
			// load the wav file into the slot
			dataWAV[i] = wavData;
			
			// enable the buttons; set the filename
			let n = i+1;
			document.getElementById("play"+n).disabled = false;
			document.getElementById("save"+n).disabled = false;
			document.getElementById("dead"+n).disabled = false;
			document.getElementById("file"+n).textContent = filenameTNW+"_"+n;

	}
}

// ==========================================================
// Startup code at top level
// __________________________________________________________
// Attach handlers to all the individual load/play/save/dead buttons

if (DEBUG) {console.log("Number of buttons",load.length);}

for (let i = 0; i< load.length; i++) {
	// load[i].addEventListener('click', function() { fnLoadWav(this); }, false);
}

for (let i = 0; i< play.length; i++) {
	play[i].addEventListener('click', function() { fnPlayWav(this); }, false);
}

for (let i = 0; i< save.length; i++) {
	save[i].addEventListener('click', function() { fnSaveWav(this); }, false);
}

for (let i = 0; i< dead.length; i++) {
	dead[i].addEventListener('click', function() { fnDeadWav(this); }, false);
}

// __________________________________________________________
// Attach hander to the save/load TNW file

// document.getElementById("saveTnw").addEventListener('click', function() { fnSaveTnw(); }, false );

document.getElementById("loadTnw").addEventListener('click', function() { fnLoadTnw(); }, false );

// Load the TNW header
fnFetchHeader();