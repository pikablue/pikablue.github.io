const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const data = new Array(16);

for (let i =0; i<data.length; i++) {
		data[i] = new ArrayBuffer;
}

const load = document.querySelectorAll("button.load");
const play = document.querySelectorAll("button.play");
const save = document.querySelectorAll("button.save");
const dead = document.querySelectorAll("button.dead");

let numberLoaded = 0;

console.log(load.length);

for (let i = 0; i< load.length; i++) {
	load[i].addEventListener('click', function() { fnLoad(this); }, false);
}

for (let i = 0; i< play.length; i++) {
	play[i].addEventListener('click', function() { fnPlay(this); }, false);
}

for (let i = 0; i< save.length; i++) {
	save[i].addEventListener('click', function() { fnSave(this); }, false);
}

for (let i = 0; i< dead.length; i++) {
	dead[i].addEventListener('click', function() { fnDead(this); }, false);
}

document.getElementById("saveTnw").addEventListener('click', function() { fnSaveTnw(); }, false );

document.getElementById("loadTnw").addEventListener('click', function() { fnLoadTnw(); }, false );


const inputFile = "";

// Fetch the header and code tables for later use
let headerBuffer = null;
fnFetchHeader();


function fnFetchHeader() {
	const req = new XMLHttpRequest();
	req.open("GET", "/data/header.tnw",true);
	req.responseType = "arrayBuffer";
	
	req.onload = (event) => {
		headerBuffer = req.response;
	};
	
	req.send(null);
}


function fnLoad(e) {
	// get the ID number
	const n = e.id.substr(4,2);
	
	// Create and launch the handler
	let input = document.createElement('input');
    input.type = 'file';
	input.accept = ".wav";
	input.onchange = () => {
		fnFileInput(n, input.files[0]);
	};
	input.click();
}

function buf2hex(buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
}

function fnFileInput(n, inputFile) {
	
	console.log(n, inputFile);
	
	// Check for non-zero
	if (inputFile.name=="") {
		console.log("No File");
		return;
	}
	
	// Check for extension
	if ( inputFile.name.split('.').pop() != "wav" ) {
		window.alert("Only WAV files can be loaded at present");
		return;
	}
			
	// Read the data now using FileReader. 
	const r = new FileReader();
	
	r.onload = function() {
		console.log(r.result);
		data[n]=r.result;
		// console.log(buf2hex(r.result));

		// Check if we are adding a new one
		if (document.getElementById("play"+n).disabled == true) {
			numberLoaded = numberLoaded+1;
		}
		console.log(numberLoaded);

		// Add into the name
		document.getElementById("file"+n).textContent = inputFile.name;

		// enable all the other ones
		document.getElementById("play"+n).disabled = false;
		document.getElementById("save"+n).disabled = false;
		document.getElementById("dead"+n).disabled = false;
		
		document.getElementById("saveTnw").disabled = false;

	};
	r.onerror = function() {
		window.alert("Couldn't load File");
		console.log(r.error);
		
	};
	
	// Limit the file size to 200Kb
	const blob = inputFile.slice(0, 200 * 1000);
	r.readAsArrayBuffer(blob);

}

function fnPlay(e) {
	console.log(e.id);

	// get the ID number
	const n = e.id.substr(4,2);

	// play the file
	audioCtx.resume();
	const a = data[n].slice(0);	// Copy to avoid the buffer detaching
	audioCtx.decodeAudioData(a).then(function(buffer) {		
		let soundSource = audioCtx.createBufferSource();
		soundSource.buffer = buffer;
		soundSource.connect(audioCtx.destination);
		console.log("Playing");
		soundSource.start(0);
	});

}

function fnSave(e) {
	console.log(e.id);
	window.alert("Save is not yet implemented");

}

function fnDead(e) {
	// get the ID number
	const n = e.id.substr(4,2);
	
	// Clear the name
	document.getElementById("file"+n).textContent = "Not Loaded";

	// enable all the other ones
	document.getElementById("play"+n).disabled = true;
	document.getElementById("save"+n).disabled = true;
	document.getElementById("dead"+n).disabled = true;
	
	// If all are dead, disable the Save TNW button
	if (numberLoaded > 0) {
		numberLoaded = numberLoaded - 1;
	}
	if (numberLoaded == 0) {
		document.getElementById("saveTnw").disabled = true;
	}
	console.log(numberLoaded);

}

// Function to download data to a file
function fnSaveAs(data, filename) {
    let file = new Blob([data], {type: "application/octet-stream"});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
		let url = URL.createObjectURL(file);
		let a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
 		console.log(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function fnSaveTnw() {
	console.log("SaveTNW");

	// Check the header from the server
	if (headerBuffer == null) {
		console.log("Header file not retrieved correctly");
		return;
	}
	
	// Go through each of the buffers from the start
	// Decode the file : 16 or 8 bit, mono or stereo
	for (let i =0; i<data.length; i++) {
		if (data[i].byteLength == 0) continue;
		// Byte version
		let view = new Uint16Array(data[i]);
		// Assume WAV for the moment
		let format = view[10];	// mono or stereo
		let channels = view[11];	// mono or stereo
		let rate = (2^8)*view[12] + view[13];		// 
		let bits = view[17];
		console.log("Index " + i + " PCM:" + format + " M/S:" + channels + " Rate:" + rate + " bits:" + bits);
		

	}
		
	
	// fnSaveAs(data[16],"Testing.TNW");
}

function fnLoadTnw() {
		console.log("LoadTNW");
}



