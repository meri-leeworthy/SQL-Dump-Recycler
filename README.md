# SQL Dump Recycler

I created this interactive CLI tool to help me extract data out of a really big SQL dumpfile (over 100,000 lines) that I got when I shut down a [Discourse](https://www.discourse.org) server me and some other activists had been experimenting with. I tried to include some abstractions that might extend the tool to other use cases. I've included a truncated version of the dumpfile I was working with in `/example/dump.sql`.

download: `git clone https://github.com/meri-leeworthy/SQL-Dump-Recycler.git`
install: `cd sql-dump-recycler && npm install`
run: `node recycler.js`

## The tool

- It looks for all the `COPY public.tablename` statements and asks you which table you want to export the data from.
- You can then select which columns from that table you want to export.
- In this iteration of this idea, data is exported as one file per row. (Though the option to export as a single file could easily be an option)
- If multiple columns are being exported, the user can choose a separator to be inserted between the data. This makes exporting as CSV or TSV really easy.
- User can also input the file extension.
