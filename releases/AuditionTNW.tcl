#!/bin/sh
# The next line restarts using tclsh \
exec wish "$0" "$@"

# This is a Tcl/Tk script to play and unpack Yamaha TENORI-ON TNW sample files

# v0.1	31/05/20	Initial version 
# v0.2	01/06/20	Added afplay for MacOsX in proc play 

# INSTALLING (WINDOWS)
# 1/ Obtain a TCLKIT with TWAPI. This is a single-file version of the TCL/TK distribution; it's about 6MB
# You'll need the one with "GUI" in the title from here:
#  https://sourceforge.net/projects/twapi/files/Tcl%20binaries/Tclkits%20with%20TWAPI/

# 2/ Drag this TCL file onto the TCLKIT.

# For a more "permanent" solution, download Freewrap :
# http://freewrap.sourceforge.net/
# then drag this TCL file ontop of the executable, creating your own single-file
# executable version of this script (although large).

package require Tk

# The following WINDOWS ONLY package is used to play sounds without 
# spawning media players and other default apps.
if { $tcl_platform(platform) == "windows" } {
	package require twapi
}



# Play and Save icons
set PLAYICON "89504E470D0A1A0A0000000D4948445200000020000000200806000000737A7AF4000000017352474200AECE1CE90000000467414D410000B18F0BFC6105000000097048597300000B1300000B1301009A9C180000030C494441545847B5973D6F1341108677F7402234B1441A3A2225064C632151B8CA47E10227764805A2E10720EA341148082915057F802E82CA77E71305459C34B48E0448D880940E090251287011ECE59DDD3D7F24C7DDF97C7EA4D5CECCC599B9DDD9D939CE62522E9733DD2E2B092196A1E6A564571893D3FA293FE69C1D4068C05E97927B9E573DD6CFC2890CA05C5EBB8A6903E32EC605B2C5A02DA57C8579AB56735ADA14CC7F03585959BF2844F719C48718E7947174FE62BC10826DDAB6FD479B86090C6075B592C554E59CE7B4656C3E62DC715DFBB356FB9C09007B7D9331F116E2256D498D43E44CD1759D86D1154301D09BE3ADDF414CDBB9CF21FE7FC171AA5F8CCE8499D59E63B23126E59C984172DAA5D2FA94D1FB0150C221BAEB469D24372CABF3D4C83A0073D428DB43E82E610FF78C3226FC11B67B9E247F05E89C871E35D7757791408B3A10B6ABAD89398F20C827E354E110C737C8A1450647E854C2AE2DA2FA3D8688A012D1EE74E46541E5154ADC0AD7A356B3B122F6124A6FD21599B22C761BA55DD5F6C48C17085FA61CC86B653C12069217FA564B0F3F106C2DE5465420B35801FF4A4D17CFB3F7A2024151CAF40AD1A4C049090501F0588DC3A8E0982EA0C0D51100BD7DE05145E53D12A693490DAA0F518E0738A02D18BA1E9332E0B80E356E716AD029A01F240695148E2BA33A56C0F70E02E01EE4B636C5C7778C34C2E0233936B439EFBE11D4BD9A063216C631F637B1639F6D5C70BFD521319D10F56D213722DD82FC09C682318CC309FCE5A833B2486BB59A3FB3D96B19EC63413D0E843FC048A96ACAE72852AF49EA1522DC4C9B986815260A12EFBD109CAE71C5509DC231A22E859AD21965489F1FC8B7023E56BE1ABDBF020496057DBB2C42440B9D3A70CE8A83CE89337701F5EDD43A434C6D3BF0D61FE87FE2A6DC37A61E2A094FD36C7EFA3537977B894E199D12BF0553E0DFC5E08412CEB2F87DC7B1BF1BDB101177953AA2C80BBE8113720F6AAF9F8F800ADB36DE7A6BF0232488C8007C4AA5CA34F570F889FA3CC798A5FB9C9EC1D11126FFF37C872A1C15197A160E63FF00366714E8195487DB0000000049454E44AE426082"

set SAVEICON "89504E470D0A1A0A0000000D4948445200000020000000200806000000737A7AF4000000017352474200AECE1CE90000000467414D410000B18F0BFC6105000000097048597300000EC300000EC301C76FA8640000025B494441545847C597B16BDB4018C5254BB6DB808742F1E06E5E6C1CB029F91FBA150A5DBA74281D9B0C29F5120821784B4C4D4876535AE89439D0FE051DB288BAF6E431713C648AA96D61D4F7AC8BC0B14E3A5589F583C77777D677F7247D3AC9BA06AAD52AC36B5DD7B711371CC7A95B9675C24155CAE5B29ECD666FD07C04FDC11C07885F310F7F96A28BC59B58FC23FBEC20792BCC00F21E23E7039A591CDF9E4EA797C2C0DAFC80F9344E03712FC8440AE2997B8B47E025C4B36C082377C1B0BE8BB82F4ED297140EE2658FBA384943CCA3D8F623D404AFC086DB8C8C23446EA31F81266880457317952BF213F7F80BE277C46F8661704C962735A1D76A353FF76798F4D56834B211C5909C743AADA1005F6091337483CC63BAC5C29419E0D810BA9EF7C2E1E9172173DE0B66C184CCC043E399600D24C16D4DBC4DCA00A1897A9206C87AD20652491B903E057CFEDB88176E373605DCEF77884B5BB6AF012CDEB46DBBDEED76C5483C4AA51237AA4398F824863C6406965EC7C56251657BF6E8F7FB0BF3620BDE848163D1F550AA0198DCC9E5729D28628E480F44C900AEC873847214899C50549F823798B01045CC71538351AE81B8C86A40C9003E3819221521707ABD9E68C62CC24C26D3C4633480AE1435608E480F44B5069E404F238A39A12819C027F7FBC964624286A24CE688F440A43BE16C36AB773A1D31128F4AA5A299A6A9BE13021BBAD77701247D17FC45F4FB325E0563D6C0B9DB4E84F314EE770B0DBFDBF0D06069A74503A7D0670EB8E32B818B73CD5363381C6AF97CFE073ABF51A5CF10F390CAF7FDFF30867E6171FE193EB22C4BFB07BEA64DC694D637670000000049454E44AE426082"

# Correction/Decode matrix
set CORRECTION "048C048C048C048C0C840C840C840C84048CE26A048CE26A0C84EA620C84EA62048C048CC048C0480C840C84C840C840048CE26AC048AE260C84EA62C840A62E0C840C840C840C848C048C048C048C040C84EA620C84EA628C046AE28C046AE20C840C84C840C8408C048C0448C048C00C84EA62C840A62E8C046AE248C026AE159DF37B159DF37B1D95FB731D95FB73F37BF37BF37BF37BFB73FB73FB73FB73159DF37BD159BF371D95FB73D951B73FF37BF37BBF37BF37FB73FB73B73FB73F1D95FB731D95FB739D157BF39D157BF3FB73FB73FB73FB737BF37BF37BF37BF31D95FB73D951B73F9D157BF359D137BFFB73FB73B73FB73F7BF37BF337BF37BF26AE26AEE26AE26A2EA62EA6EA62EA6226AE048CE26AC0482EA60C84EA62C840E26AE26AE26AE26AEA62EA62EA62EA62E26AC048E26AC048EA62C840EA62C8402EA62EA6EA62EA62AE26AE266AE26AE22EA60C84EA62C840AE268C046AE248C0EA62EA62EA62EA626AE26AE26AE26AE2EA62C840EA62C8406AE248C06AE248C037BF159DF37BD1593FB71D95FB73D951159D159DD159D1591D951D95D951D951F37BD159F37BD159FB73D951FB73D951D159D159D159D159D951D951D951D9513FB71D95FB73D951BF379D157BF359D11D951D95D951D9519D159D1559D159D1FB73D951FB73D9517BF359D17BF359D1D951D951D951D95159D159D159D159D1"

set WAVHEADER "52494646"
set WAVMONO   "57415645666D7420100000000100010044AC000010B102000200100064617461"
set WAVSTEREO "57415645666D7420100000000100020044AC000010B102000400100064617461"


# Name of a temporary file created on the fly to allow sounds
# to be auditioned
set TEMPFILENAME "_auditionTnwTempFile_.wav"


# Decode the TNW word into a WAV word
proc wordOut {wordIn} {
	if {[string length $wordIn] == 0} { return 0 }
	
	set in1 [expr { ($wordIn & 0xF000) >> 12} ]
	set in2 [expr { ($wordIn & 0x0F00) >> 8 } ]
	set in3 [expr { ($wordIn & 0x00F0) >> 4 } ]
	set in4 [expr { $wordIn & 0x000F} ]
	
	set ci [ expr { 64 * ($in1 & 12) + 32* ($in2 & 7) + 4 * ($in3 & 7) + ($in4 & 3) } ]
		
	set c3 [expr 0x[string index $::CORRECTION $ci]]
	
	set out3 [expr { ($in2 + $in3 + $c3) & 0xF } ]

	set result [ expr { ($in4) + ($out3<<4) + ($in2<<8) + ($in1<<12) } ]
	
	return $result

}


# Reads the file in and performs the relevant conversions
# Returns a list of the valid buttons
proc parse {filename} {
	
	set ::Progress "Loading file"
	update
	
	set f [open $filename r]
	chan configure $f -translation binary

	# fetch the sample data
	seek $f 0x3AE start
	
	# Check the lengths - L slots
	set slots {}
	for {set i 0} {$i<16} {incr i} {
		set temp [read $f 2]
		binary scan $temp H* length
		# puts " L Slot $i, start =$length"
		
		binary scan $temp s* length
		set length [expr {$length & 0xFFFF}]
		
		set ::SamplestartL_${i} [expr {$length * 0x20 + 0x680}]

		set temp [read $f 2]
		set temp [read $f 2]
		
		binary scan $temp H* length
		# puts " L Slot $i, length =$length"
		
		binary scan $temp s* length
		set length [expr {$length & 0xFFFF}]
		set ::Samplelength_${i} $length
		
		seek $f 24 current
	}
	
	# Check the lengths - R slots
	seek $f 0x61E start
	for {set i 0} {$i<16} {incr i} {
		set temp [read $f 2]
		binary scan $temp H* length
		# puts " R Slot $i, start=$length"
		binary scan $temp s* length
		set length [expr {$length & 0xFFFF}]
		
		set ::SamplestartR_${i} [expr {$length * 0x20 + 0x680}]
		set temp [read $f 2]
		set temp [read $f 2]

		binary scan $temp H* length
		# puts " R Slot $i, length =$length"

		binary scan $temp s* length
		set length [expr {$length & 0xFFFF}]
		# Check the length is correct
		if {$length == 0} {
			# do nothing
		} elseif { $length != [set ::Samplelength_${i} ] } {
			puts "Length mismatch in samples in slot [expr $i+1]"
			puts "Length L : [set ::Samplelength_${i}], Length R : $length"
			set ::Samplelength_${i} 0
		} else {
			set ::Samplelength_${i} [ expr {$length * 0x20 } ]		
			lappend slots $i
		}
		seek $f 24 current
	}
		
	
	# Load the samples
	for {set i 0} {$i<16} {incr i} {
		set slength [set ::Samplelength_${i}]
		set ::Progress "Processing slot [expr $i+1]"
		update

		if {$slength > 0} {
			set lstart [set ::SamplestartL_${i}]
			set rstart [set ::SamplestartL_${i}]
			
			set wavfile ""
			append wavfile [binary format H*  $::WAVHEADER]
			
			seek $f $lstart start
			set leftChan [read $f $slength]
			
			if {$lstart==$rstart} {
				# mono
				# could just generate as stereo, but quicker to 
				# read genuine mono file.
				# put the file size
				append wavfile  [binary format i* [expr {$slength + 44}] ]
				append wavfile [binary format H* $::WAVMONO]

				# data size
				append wavfile [binary format i* [expr {1*$slength}]]
				# Now we have to run through the left and right channels one by one
				for {set j 0} {$j<$slength} {incr j 2} {
					set leftWord [string range $leftChan $j [expr $j+1] ]

					if {[binary scan $leftWord S* valueIn] >0 } {
						set valueOut [ wordOut $valueIn ]
						append wavfile [binary format S* $valueOut]	
					} else {
						append wavfile [binary format S* 0]	
					}
					
				}
			
			} else {
				#stereo
				# put the file size
				append wavfile  [binary format i* [expr {2*$slength + 44}]]
				append wavfile [binary format H* $::WAVSTEREO]
				
				# data size
				append wavfile [binary format i* [expr {2*$slength}]]

				seek $f $rstart start
				set rightChan [read $f $slength]

				# Now we have to run through the left and right channels one by one
				for {set j 0} {$j<$slength} {incr j 2} {
					set leftWord [string range $leftChan $j [expr $j+1] ]

					if {[binary scan $leftWord S* valueIn] >0 } {
						set valueOut [ wordOut $valueIn ]
						append wavfile [binary format S* $valueOut]	
					} else {
						append wavfile [binary format S* 0]	
					}
					
					set rightWord [string range $rightChan $j [expr $j+1] ]
					
					if {[binary scan $rightWord S* valueIn] >0 } {
						set valueOut [ wordOut $valueIn ]
						append wavfile [binary format S* $valueOut]	
					} else {
						append wavfile [binary format S* 0]	
					}
				}
			}
										
			set ::Wavfile_${i} $wavfile
		} else {
			set ::Wavfile_${i} ""
		}
	}
	
	close $f
	
	set ::Progress ""
	update

	return $slots
}

# This auditions the sound using TWAPI
# This works on WINDOWS only
proc play {slot} {
	
	if { [set ::Samplelength_${slot} ] <= 0} {
		return
	}
	
	set ::Progress "Playing slot [expr $slot+1]"
	update

	set f [open $::TEMPFILENAME w]
	chan configure $f -translation binary
	puts -nonewline $f [set ::Wavfile_${slot} ]
	close $f

	if { $::tcl_platform(platform) == "windows" } {
		twapi::play_sound $::TEMPFILENAME
	} elseif { $::tcl_platform(os) == "Darwin" } {
		# Attempt to work on MacOsX
		exec {*}[auto_execok afplay ] "" [file nativename [file normalize $::TEMPFILENAME]]
	}	

	# This is a sensible fallback if TWAPI is not available
	# exec {*}[auto_execok start ] "" [file nativename [file normalize $::TEMPFILENAME]]
	
	file delete $::TEMPFILENAME
	
	set ::Progress ""
	update
	
	
}

# This saves the selected slot as a WAV file
proc save {slot} {
	set types { { {WAV Files} {.wav} } }
	set a [tk_getSaveFile -filetypes $types -defaultextension wav ]
	if {$a!=""}  {
		set ::Progress "Saving slot [expr $slot+1] to file $a"
		update
		set f [open $a w]
		chan configure $f -translation binary
		puts -nonewline $f [set ::Wavfile_${slot} ]
		close $f
		set ::Progress ""
		update
	}
}

# This is the start of the main code, and sets up the GUI
set types { { {TNW Files} {.tnw} } }
frame .a -bd 2
set targetTnwFile ""
label .a.tnw -text "TNW File:"
entry .a.tnwFileName -textvariable targetTnwFile -state disabled

button .a.browse -text "Browse" -command {
	set a [tk_getOpenFile -filetypes $types]
	if {$a!=""}  {
		set targetTnwFile [file tail $a ]
		# Open The file and read the number of sounds
		set slots [parse $a]
		# Enable the right number of slots
		for {set i 0} {$i<16} {incr i} {
			if {[lsearch $slots $i]>-1} {
				.${i}.play configure -state normal
				.${i}.save configure -state normal
			} else {
				.${i}.play configure -state disabled
				.${i}.save configure -state disabled
			}
		}
		
	} 
}

set Progress ""
pack .a.tnw .a.tnwFileName .a.browse -side left -fill x -expand 1
label .progress -textvariable Progress

grid .a -row 0 -columnspan 4
grid .progress -row 1 -columnspan 4

image create photo .play -format PNG -data [binary format H* $::PLAYICON]
image create photo .save -format PNG -data [binary format H* $::SAVEICON]
for {set i 0} { $i<16 } {incr i} {
	frame .$i -bd 2
	label .${i}.lab -text [expr {$i+1}]
	button .${i}.play -image .play -command "play $i" -state disabled 
	button .${i}.save -image .save -command "save $i" -state disabled 
	pack .${i}.lab .${i}.play .${i}.save -side left 
	grid .$i -row [expr {2 + $i%4}] -column [expr {int($i/4)} ] -padx 4 -pady 4
}

wm title . "Audition TNW Files"
