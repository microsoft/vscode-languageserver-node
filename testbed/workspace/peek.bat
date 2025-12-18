FOR %%f IN (*.jpg *.png *.bmp) DO XCOPY C:\source\"%%f" c:\images /m /y
REM This moves any files with a .jpg, .png,
REM or .bmp extension from c:\source to c:\images;;