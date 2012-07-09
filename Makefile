doc: 
	@./node_modules/.bin/docker *.js -o docs 

test:
	@./node_modules/.bin/mocha

.PHONY: test
