from openai import OpenAI

from rag.rag import LlamaIndexRetriever

client = OpenAI(api_key="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")
from collections import defaultdict
import json


def generate_decisions(event: str, context: str, model="o3-mini", num_decisions=3):
    """
    Uses OpenAI's model to generate structured decisions based on a policy order.
    """
    system_prompt = """
    You are a senior company analyst.
    Given an event, and the company's business and other context, suggest 0 or more decisions that would be good for the company.
    Include reasoning
    """

    user_prompt = f"""
    Generate {num_decisions} structured cascading decisions the company could make for the following policy order:
    "{event}"

    use the following context to make the decisions:
    {context}
    Output raw JSON only, that can be directly parsed as JSON
    """

    response = client.chat.completions.create(
        model="o3-mini",
        reasoning_effort = "high",
        messages=[
            {"role": "developer", "content": system_prompt},
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content

    if content.startswith("```json"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]

    print(content)
    decisions = json.loads(content)
    return decisions




if __name__ == "__main__":
    # policy_order = input()
    # policy_order = "Require 50% women for all FTSE 100 board members"
    obj = LlamaIndexRetriever()
    event = "AS INTRODUCED IN THE RAJYA SABHA \nON 2ND FEBRUARY, 2024 \n\nBill No. V of 2024 \n\nTHE REPRESENTATION OF THE PEOPLE \n(AMENDMENT) BILL, 2024 \n\nA \nBILL \n\nfurther to amend the Representation of the People Act, 1951. \n\nBE  it  enacted  by  Parliament  in  the  Seventy-fifth  Year  of  the  Republic \n\nof India as follows:– \n\n1.\n\n(1)   This Act may be called the Representation of the People (Amendment)\nAct, 2024.\n\n(2) It shall come into force on such date as the Central Government may, by\nnotification in the Official Gazette, appoint.\n\n2.\n\nIn  the  Representation  of  the  People  Act,  1951,  after  section  127A,  the\nfollowing new sections shall be inserted, namely,–\n\nShort \ncommencement. \n\ntitle \n\nand \n\n ―127B.  (1)  Any  person  who  is  found  paying  for  news,  or  receiving \npayment  for  news  shall  be  punished  with  imprisonment  for  a  term  which \nmay extend to three years, and with fine, which may extend to twenty-five \nlakh rupees. \n\nPaying for news. \n\n5 \n\n10 \n\n 43 of 1951. \n\n\fNon-disclosure  of \ninterest in political \nadvertising.  \n\n Offences by  \ncompanies.  \n\n(2) Nothing contained in sub-section (1) shall apply to payments made\nby  registered  political  parties  for  the  management  of  official  publications \n(print, radio, television and all other electronic media) owned or controlled \nby them.  \n\n(3) To  avail  of  the  exemption  under  sub-section  (2),  all  registered\npolitical parties must disclose their interests in any publication in the form \nand manner notified by the Election Commission of India in this regard.  \n\n5 \n\n(4) An  attempt  to  commit  an  act  punishable  under  sub-section  (1)\nshall be punished with imprisonment  for a term, which may extend to two \nyears, or with fine, which may extend to ten lakh rupees, or with both.  \n\n10 \n\n(5) No  court  shall  take  cognisance  of  any  offence  punishable  under\nthis section unless there is a complaint made by order of, or under authority \nfrom,  the    Election  Commission  of  India  or  the  Chief  Electoral  Officer  of \nthe State concerned.  \n\n127C.  (1)  Any  political  advertisement  in  any  media  shall  carry  a \ndisclosure to this effect in the form and manner notified by the ECI in this \nregard.  \n\n(2) Any person who contravenes the provision of sub-section (1) shall\nbe  punishable  with  imprisonment  for  a  term,  which  may  extend  to  six \nmonths, or with fine, which may extend to five lakh rupees, or both.  \n\n127D. (1) Where an offence under sub-section (1) of section 127B has \nbeen  committed  by  a  company,  every  person  who,  at  the  time  the  offence \nwas committed, was in charge of, and was responsible to the company for \nthe conduct of the business of the company, as well as the company, shall \nbe  deemed  to  be  guilty  of  the  offence  and  shall  be  liable  to  be  proceeded \nagainst and punished accordingly:  \n\n15 \n\n20 \n\n25 \n\nProvided  that  nothing  contained  in  this  sub-section  shall  render  any \nsuch person liable to any punishment provided in this Act if he proves that \nthe  offence  was  committed  without  his  knowledge  or  that  he  exercised  all \ndue diligence to prevent the commission of such offence.  \n\n30 \n\n(2) Notwithstanding anything contained in  sub-section  (1),  where an\noffence under this Act has been committed by a company and it is proved \nthat the offence has been committed with the consent or connivance of, or is \nattributable to any neglect on the part of, any director, manager, secretary or \nother  officer  of  the  company,  such  director,  manager,  secretary  or  other \nofficer shall also be deemed to be guilty of that offence and shall be liable to \nbe proceeded against and punished accordingly.  \n\n35 \n\nExplanation.— For the purpose of this section,— \n\n(a) ―company‖ means any body corporate, and includes a firm or other\nassociation of individuals; and\n\n40 \n\n(b) ―director‖, in relation to a firm, means a partner in the firm.‖\n\n2 \n\n\fSTATEMENT OF OBJECTS AND REASONS \n\n        The  influence  money  exerts  in  corrupting  the  democratic  process  is \nundeniable  and  sadly,  this  is  true  now,  more  than  ever.  In  our  increasingly \nconnected, media heavy world, political advertisements are omnipresent and an \nessential  part  of  any  campaign.  Unregulated,  they  provide  a  platform  for \ncandidates to propagate patent untruths. This severely undermines the right to \naccurate information based on which a voter can make his or her decision. The \nseriousness of these issues is amplified by the extent to which it has become a \nsystematic part of promoting one‘s election. The money spent on unethical paid \nnews and disguised political advertisements, is rising at an exponential rate in \nboth national as well as regional media. \n\n  In  PUCL  v.  Union  of  India  (2003)  4  SCC  399,  the  Supreme  Court  held \nthat availability of impartial, proper and relevant information about the election \ncandidates fosters and promotes freedom of speech and expression. Paid news \ndistorts  this  right.  As  per  the  2010  Press  Council  Sub-Committee  report  on \nPaid News, it was suggested that the act of publishing news items in exchange \nfor  consideration  should  be  construed  as  electoral  malpractice  with  a \npunishment  of  minimum  2  years  imprisonment.  The  Election  Commission  of \nIndia  in  its  2012  circular,  which  was  later  incorporated  in  the  Handbook  for \nMedia  for  Lok  Sabha  General  Elections,  proposed  that  the  Representation  of \nthe  People  Act,  1951,  should  be  amended  to  prevent  the  publishing  and \nabetment to publish any paid news for furthering the prospects of a candidate‘s \nelection.  In  2014,  TRAI  in  its  recommendations  on  media  ownership  also \nrecommended  that  the  term  ‗paid  news‘  should  be  comprehensively  defined \nand a proper framework for scrutinizing complaints and taking punitive actions \nshould be established.  \n\n  In the United Kingdom, there is a blanket ban on telecasting paid political \nadvertisements  on  television  and  radio.  This  prohibition  also  extends  to  any \nadvertisement  which  tends  to  influence  public  opinion  on  a  matter  of  general \ncontroversy. As per the Commonwealth Electoral Act, 1918 of Australia, it is \nmandatory  for  unfolding  the  details  of  any  electoral  advertisement,  handbill, \npamphlet, poster or notice that contains electoral matter. Similarly in Canada, \nthe  Canada  Election  Act,  2000,  sets  provisions  for  adequately  disclosing  the \ndetails of any electoral advertising.   \n\n Currently,  the  guidelines  for  disclosing  political  paid  advertisements  are \nnot  adequately  framed  and  uniform.  To  check  disguised  paid  political \nadvertisements,  the  disclosure  provisions  have  to  be  made  compulsory  for  all \nmedia  firms  to  assist  the  public  in  identifying  the  nature  of  content  (whether \nsponsored  or  editorial  content)  and  keep  a  vigilant  track  of  transactions \nbetween the media and election candidates.  \n\n  Hence, this Bill. \n\nSASMIT PATRA \n\n3 \n\n\fRAJYA SABHA \n\n_______ \n\nA \n\nBILL \n\nfurther to amend the Representation of the People Act, 1951. \n\n_______ \n\n(Dr. Sasmit Patra, M.P.) \n\nRS-P&PS─PMB(E)─054─05.02.2024.\n\n\f"
    context = obj.retrieve_context(event)

    print(context)
    print("--------------------------------")
    decisions = generate_decisions(event, context)
    
