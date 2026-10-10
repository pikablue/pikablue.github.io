// v1 : Audition only
// v2 : TNW saving

const VERSION = "Voice Manager v2 11/10/24";
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
		if (DEBUG) {console.log("Fetched header");}
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
	return String.fromCharCode((a>>24)&0xFF,(a>>16)&0xFF,(a>>8)&0xFF, a&0xFF);
}

// concatenates arraybuffers...
function concat(a,b) {
	let c = new Uint8Array(a.byteLength + b.byteLength);
	c.set(new Uint8Array(a),0);
	c.set(new Uint8Array(b), a.byteLength);
	return c.buffer;
}

// adds data to dataView
function dataWAVadd(n,a) {
	dataWAV[n] = concat(dataWAV[n] ,a);
}

// Checks the format, and trims if needed
// ab is the input arraybuffer
function fnWavCheck(n,ab) {
	if (DEBUG)  {console.log("fnWavCheck");}

	if (DEBUG)  {console.log("DataWAV is "+dataWAV[n-1].byteLength+" bytes long");}

	
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
	if ( fnChunkName(temp) != "RIFF" ) {
		console.log("ChunkID is not RIFF");
		return;
	}
	temp = wavView.getUint32(8,false);
	if ( fnChunkName(temp) != "WAVE" ) {
		console.log("Format field is not WAVE");
		return;
	}
	
	// Set the file to the header
	dataWAV[n-1] = ab.slice(0,12);


	
	let inptr = 12;		// the dataptr to the first header
	let outptr = 12;		// the dataptr to the first header

	let audioformat = 0;
	let channels = 0;
	let rate = 0;
	let bits = 0;
	let audiolength = 0;
	
	// make sure we have enough bytes to read the format ID
	while (inptr<(ab.byteLength-8)) {		
		temp = wavView.getUint32(inptr,false);
		let hlen = wavView.getUint32(inptr+4,true)+8;

		if ( fnChunkName(temp) == "fmt " ) { 
		
			if (DEBUG)  {console.log("SubchunkID is fmt");}
			
			// check that the file contains all the format
			if (hlen+inptr > ab.byteLength) {
				console.log("Incomplete subchunk in file");
				break;
			}
		
			// Parse the fmt chunk
			audioformat = wavView.getUint16(inptr+8,true);	// PCM=1
			channels = wavView.getUint16(inptr+10,true);	// mono or stereo
			rate = wavView.getUint32(inptr+12,true);		// 
			bits = wavView.getUint16(inptr+22,true);
			// Copy the header over and move the output along
			dataWAVadd(n-1,ab.slice(inptr,inptr+hlen));
			outptr+= hlen;

		} else if ( fnChunkName(temp) == "data" ) {
			if (DEBUG)  {console.log("SubchunkID is data");}
			audiolength = hlen-8;	// reported length
			// check that this doesn't go beyond the file!
			let truncated = false;
			if (hlen+inptr > ab.byteLength) {
				audiolength = ab.byteLength-inptr-8;
				console.log("Reported length of audio <"+(hlen-8)+"> exceeds the audio in the file <"+audiolength+">");
				console.log("Truncating...");
				wavView.setUint32(inptr+4,audiolength,true);
				truncated = true;
			}
			// Truncate the WAV file to 171168 = 0x29CA0 bytes (TNR max)
			let maxwav = 171168;
			
			if (audiolength>maxwav) {
				console.log("Truncating WAV file audio from "+audiolength+ " to maximum "+maxwav);
				audiolength = maxwav;
				wavView.setUint32(inptr+4,audiolength, true);
				truncated = true;
			}
			// we scale fast over the last 500 samples (usually 0.01s)
			if (truncated === true) {
				console.log("Fading volume to avoid clip");
				let nsamples = 1000;
				let loc = inptr+audiolength+8;
				for (let i=0;i<nsamples;i++) {
					loc -= 2*channels;
					let frac = i/nsamples;
					let v = wavView.getInt16(loc,true);
					wavView.setInt16(loc,v*frac,true);
					if (channels==2) {
						v = wavView.getInt16(loc+2,true);
						wavView.setInt16(loc+2,v*frac,true);
					}
				}
					
			}
			// Copy the chunk header over and move the output along
			dataWAVadd(n-1,ab.slice(inptr,inptr+audiolength+8));
			outptr+=audiolength+8 ;
			// Fade the volume down if we are truncating to avoid pops


			
			// We might as well skip the rest of the file
			break;

		} else {
			console.log("Unrecognized subchunk : "+ fnChunkName(temp) +", jumping to "+ inptr+hlen + " (length is "+ab.byteLength+")");
		}
		// jump to next chunk
		inptr += hlen;

	}
				
	if (DEBUG) {
		console.log("  PCM:" + audioformat);
		console.log("  M/S:" + channels);
		console.log("  Rate:" + rate);
		console.log("  bits:" + bits);
		console.log("  length:" + audiolength);
		console.log("DataWAV is "+dataWAV[n-1].byteLength+" bytes long");
	}


	// Overwrite the length in the header
	wavView = new DataView(dataWAV[n-1]);
	wavView.setUint32(4,dataWAV[n-1].byteLength,true);

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
	if ( inputFile.name.split('.').pop().toUpperCase() != "WAV" ) {
		window.alert("Only WAV files can be loaded at present");
		return;
	}
			
	// Read the data now using FileReader. 
	
	reader.onload = function() {
		if (DEBUG) {console.log(reader.result);}
		
		fnWavCheck(n,reader.result);
		
		
		// console.log(buf2hex(r.result));

		// Check if we are adding a new one
		if (document.getElementById("play"+n).disabled == true) {
			numberLoaded = numberLoaded+1;
		}
		if (DEBUG) {console.log("Slots in use : "+numberLoaded);}

		// Add into the name
		document.getElementById("file"+n).textContent = inputFile.name.split('.')[0];

		// enable all the other ones
		document.getElementById("play"+n).disabled = false;
		document.getElementById("save"+n).disabled = false;
		document.getElementById("dead"+n).disabled = false;
	
		// Enable the saveTnw button
		document.getElementById("saveTnw").disabled = false;


	};
	reader.onerror = function() {
		window.alert("Couldn't load File");
		if (DEBUG) {console.log(reader.error);}
		
	};
	
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
	const a = dataWAV[n-1].slice(0);	// Copy to avoid the buffer detaching. Plus 
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
	if (DEBUG) {console.log("Slots in use : "+numberLoaded);}

}


// __________________________________________________________
// Generating and Saving a TNW file
function fnSaveTnw() {
	if (DEBUG) {console.log("fnSaveTNW",headerTNW.byteLength);}

	let filename = prompt("Enter the file name to save as.");
	if (!filename) {
		return
	}

	// Check the header from the server
	if (headerTNW.byteLength != 0x860) {
		if (DEBUG) {console.log("Header file not retrieved correctly");}
		window.alert("TNW header file not retrieved correctly from website");
		return;
	}
	
	// Copy the header into the TNW data buffer
	dataTNW = headerTNW;
	
	// new Uint8Array(dataTNW,0,headerTNW.byteLength).set(new Uint8Array(headerTNW),0);


	// This is to allow access to the offsets and lengths
	let view = new DataView(dataTNW);
	
	// Go through each of the slots from the start
	let audioPointerOff  = 0;		// cumulative audio pointer in blocks of 0x20 bytes
	for (let i =0; i<dataWAV.length; i++) {
		if (DEBUG) {console.log("Slot "+i);}
		// The TNW file has the L and R audio separated, so lets setup the audio buffer the right length
		
		if (dataWAV[i].byteLength==0) {
			if (DEBUG) {console.log(" No data");}
			continue;	// next slot
		}

		if (DEBUG) {console.log(" data length "+dataWAV[i].byteLength);}
					
		let wavview = new DataView(dataWAV[i]);
		let audiolength = wavview.getUint32(40,true);	// size of data2subchunk in bytes; guaranteed location by the WAV importer
		
		if (DEBUG) {console.log(" "+audiolength+" bytes of audio in slot");}
		
		// check whether we are mono or stereo
		let channels = wavview.getUint16(22, true);
		if (DEBUG) {console.log(" "+channels+" channels");}
		let bufferlength = Math.floor(audiolength / channels);
		
		if (DEBUG) {console.log(" "+bufferlength+" bytes of audio in each channel");}
		
		// Write the slot data into L & R just in case it's mono
		view.setUint16(942+i*30,audioPointerOff,true);
		view.setUint16(1566+i*30,audioPointerOff,true);
		let blocksize = bufferlength/0x20;
		view.setUint16(946+i*30,blocksize,true);
		view.setUint16(1570+i*30,blocksize,true);
		audioPointerOff+=blocksize;

		// write the slot ID data
		for (let j=0;j<8;j++) {
			let offset = (12+16*j)+(i+1)%2+2*Math.floor(i/2);
			offset = offset%128;
			view.setUint8(806+offset,i);
			view.setUint8(1430+offset,i);
		}
				
		// Assemble the L and R decoded audio from the WAV file
		let outdata = new ArrayBuffer(bufferlength);
		let outview = new DataView(outdata);
		let bytepersample = 2*channels;
		// L audio first
		for (let j =0; j<bufferlength; j+=2) {
			//console.log("j="+j); 83540
			let wordin = wavview.getUint16(44+(j*channels), true);
			let wordout = fnDecode(wordin);
			outview.setUint16(j,wordout, true);
		}
		dataTNW = concat(dataTNW,outdata) ; // Append audio to TNW
		view = new DataView(dataTNW);	// refresh the view
		
		if (channels==1) {
			continue;
		}
		// R audio
		for (let j =0; j<bufferlength; j+=2) {
			let wordin = wavview.getUint16(46+(j*channels), true);
			let wordout = fnDecode(wordin);
			outview.setUint16(j,wordout, true);
		}
		dataTNW = concat(dataTNW,outdata);  // Append audio to TNW
		view = new DataView(dataTNW);	// refresh the view
		
		view.setUint16(1566+i*30,audioPointerOff,true);
		audioPointerOff+=blocksize;


	}
		
	if (DEBUG) {console.log("Total length"+dataTNW.byteLength);}

	// Write the total file length
	let filelength = dataTNW.byteLength - 0x20;	
	view.setUint16(20,filelength>>16,true);
	view.setUint16(22,filelength&0xFFFF,true);
	
	
	// Put the name in the Title field
	// 16 chars max, little endian
	let slicename = filename.slice(0,16);
	let pos = 33;
	for (let i=0 ; i<filename.length ; i++) {
		let char = filename.charCodeAt(i);
		if (char>127) { char = 20; } 
		view.setUint8(pos, char);
		pos = pos + 3*(i%2) - ((i+1)%2);
	}
	
	// check whether we end .TNW, if not, add it.
	if ( filename.toUpperCase().endsWith('.TNW')==false) {
		filename = filename  + '.TNW';
	}
	
	fnSaveAs(dataTNW,filename);
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
		fnTnwParse();

		// enable the TNW save if it isn't already
		document.getElementById("saveTnw").disabled = false;

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
	load[i].addEventListener('click', function() { fnLoadWav(this); }, false);
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

document.getElementById("saveTnw").addEventListener('click', function() { fnSaveTnw(); }, false );

document.getElementById("loadTnw").addEventListener('click', function() { fnLoadTnw(); }, false );

document.getElementById("scriptver").textContent = VERSION;

// Load the TNW header
fnFetchHeader();