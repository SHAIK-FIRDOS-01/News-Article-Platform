# Core configuration package for SignalReport Django project
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass
