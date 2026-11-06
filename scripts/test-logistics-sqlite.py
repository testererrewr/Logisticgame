"""Offline acceptance-race test for the D1 cooperation transaction guard."""
import sqlite3, pathlib
schema=pathlib.Path(__file__).parents[1]/'drizzle/0009_logistics_independent_companies.sql'
con=sqlite3.connect(':memory:', isolation_level=None)
con.executescript('CREATE TABLE users(id TEXT PRIMARY KEY, name TEXT NOT NULL); INSERT INTO users VALUES ("a", "A"),("b","B");')
con.executescript(schema.read_text())
con.execute('INSERT INTO logistics_company_worlds(user_id,state,revision,updated) VALUES("a","a0",2,0),("b","b0",4,0)')
con.execute("INSERT INTO logistics_cooperation_offers (id,sender_id,receiver_id,site_id,good,quantity,price,status,created,expires) VALUES ('offer','a','b','own:123','bread',4.5,820,'open',10,999999)")
guard="""INSERT INTO logistics_trade_guards(id,valid) VALUES(?,CASE WHEN
  (SELECT revision FROM logistics_company_worlds WHERE user_id=?)=? AND
  (SELECT revision FROM logistics_company_worlds WHERE user_id=?)=? AND
  (SELECT status FROM logistics_cooperation_offers WHERE id=?)='open' AND
  (SELECT expires FROM logistics_cooperation_offers WHERE id=?)>? THEN 1 ELSE 0 END)"""
def transact(token,srev,brev):
    try:
        con.execute('BEGIN')
        con.execute(guard,(token,'a',srev,'b',brev,'offer','offer',100))
        con.execute('UPDATE logistics_company_worlds SET state="a1",revision=revision+1 WHERE user_id="a" AND revision=?',(srev,))
        con.execute('UPDATE logistics_company_worlds SET state="b1",revision=revision+1 WHERE user_id="b" AND revision=?',(brev,))
        con.execute('UPDATE logistics_cooperation_offers SET status="accepted" WHERE id="offer" AND status="open"')
        con.execute('DELETE FROM logistics_trade_guards WHERE id=?',(token,))
        con.execute('COMMIT')
        return True
    except sqlite3.IntegrityError:
        con.execute('ROLLBACK')
        return False
assert transact('one',2,4)
assert not transact('two',2,4), 'same offer cannot be accepted twice'
assert con.execute('SELECT revision FROM logistics_company_worlds WHERE user_id="a"').fetchone()[0] == 3
assert con.execute('SELECT revision FROM logistics_company_worlds WHERE user_id="b"').fetchone()[0] == 5
assert con.execute('SELECT status FROM logistics_cooperation_offers').fetchone()[0]=='accepted'
assert con.execute('SELECT count(*) FROM logistics_trade_guards').fetchone()[0]==0
print('PASS SQL: atomic D1-like settlement; second acceptance fails and has no partial effects.')
