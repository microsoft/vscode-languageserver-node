# TS-Config generator

Maintaining a consistent set of tsconfig files in a mono repository can be quite challenging even with the use of the extends clause. The tsconfig generator allows you to generate the configurations form a higher level configuration file which supports the following concepts:

- extending from multiple base configurations
- projects and it dependencies to generate proper references
- source folders inside a project to generate different compiler configuration per source folder (e.g. common, browser, node)
- compiler settings to generate different compiler configuration to compile, watch or publish the project.

Run `tsconfig-gen --help` to get on overview about the available options.

## History

- 0.1.0: Initial version

## License
[MIT](https://github.com/Microsoft/tsconfig-gen/blob/main/License.txt)
