truster
====

truster is a Chrome extension that prevents the rendered web-pages from loading resources hosted in untrusted, writable S3 buckets.

### What does it mean?

Websites often load assets (CSS, JS,..) hosted in AWS S3 buckets. Unfortunately, sometimes such buckets are misconfigured allowing unauthorized users to overwrite their files. This results in the possibility for attackers to inject malicious content (for instance malicious cryptomining JS) that gets delivered to the website's visitors. To protect from this threat, truster, communicating with our backend ([https://bucketsec.necst.it/](https://bucketsec.necst.it/)), verifies if the resources requested from the visited websites come from an untrusted, writable, bucket, preventing the loading of such resources.

### Install

truster beta version can be installed by enabling Chrome developer mode:
* Go to [chrome://extensions/](chrome://extensions/).
* Enable Developer mode by moving the slider at the top right corner.
* Install truster clicking on the "Unload unpacked" button at the left top corner. 

### Howto

Once installed, truster runs in background without any required action. You can chose what to do when a visited website attempts to load untrusted resources (block/ask/warn) in the options page.

### Research

truster is the outcome of a research study performed at the [NECSTLab](http://necst.it).

We present the findings of this study in the following research paper:

**There's a Hole in that Bucket! A Large-scale Analysis of Misconfigured S3 Buckets**  
Andrea Continella, Mario Polino, Marcello Pogliani, Stefano Zanero.  
*In Proceedings of the ACM Annual Computer Security Applications Conference (ACSAC), December 2018*

If you use *truster* in a scientific publication, we would appreciate citations using this **Bibtex** entry:
``` tex
@InProceedings{continella18:bucketsec,
  author =      {Andrea Continella and Mario Polino and Marcello Pogliani and Stefano Zanero},
  title =       {{There's a Hole in that Bucket! A Large-scale Analysis of Misconfigured S3 Buckets}},
  booktitle =   {Proceedings of the ACM Annual Computer Security Applications Conference (ACSAC)},
  month =       {December},
  year =        {2018}
}
```
