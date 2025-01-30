// tslint:disable: max-line-length
// tslint:disable: no-console

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Content } from "@alethio/ui/lib/layout/Content";
import { Container } from "@alethio/ui/lib/layout/Container";
import styled from "@alethio/explorer-ui/lib/styled-components";
import { SearchIcon } from "@alethio/ui/lib/icon/SearchIcon";
import { BlockchainProductDataFetcher } from "app/components/product-attahcments/fetcher";
import { Label } from "@alethio/ui/lib/data/Label";
import { ValueBox } from "@alethio/ui/lib/layout/content/box/ValueBox";
import { Hash } from "@alethio/ui/lib/data/Hash";

// styled components copied from components used on other pages from CMS
// to ensure consistent styling

const CenteredDiv = styled.div`
    margin: 0 auto;
    width: 900px;
    max-width: 100%;
    text-align: center;
`;

const Title = styled.h1`
    text-align: center;
    color: #356EFF;
    font-size: 36px;
    letter-spacing: 0.23px;
    line-height: 43px;
    font-weight: 300;
    margin: 14px 0 7px 0;
`;

const Subtitle = styled.h2`
    text-align: center;
    color: #273656;
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 0.2px;
    line-height: 19px;
    margin: 7px 0 14px 0;
`;

const InlineSearchContent = styled.div`
    display: inline-block;
    background: #FFFFFF;
    border: 1px solid #D0DEF2;
    color: #273656;
    box-shadow: 0 8px 16px 0 rgba(51, 69, 100, 0.07), 0 6px 16px 0 rgba(51, 69, 100, 0.08);
    margin-bottom: 24px;
    margin-top: 32px;
    width: 828px;
    max-width: 100%;
    box-sizing: border-box;
    position: relative;
`;

const InlineSearchInnterContent = styled.div`
    display: flex;
    -webkit-align-items: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    padding: 16px 22px;
`;

const SearchBoxContainer = styled.div`
    margin-left: 12px;
    margin-right: 24px;
    flex-grow: 1;
`;

const SearchBox = styled.input`
    display: block;
    color: #273656;
    width: 100%;
    padding-top: 5px;
    padding-bottom: 9px;
    height: 22px;
    font-family: 'Barlow', Arial, sans-serif;
    font-size: 18px;
    font-weight: 500;
    line-height: 22px;
    border: none;
    outline: none;

    &::placeholder {
        color: #D0DEF2;
        opacity: 1;
    }
`;

const SearchIconContainer = styled.div`
    color: #D0DEF2;
`;

// 150px auto
const ValuesFlex = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 0;

    & > *:first-child {
        width: 135px;
        text-align: right;
    }
`;

const LabelNoHeight = styled(Label)`
    height: auto;
`;

export function ProductAttachments(props: {
    nodeUrl: string;
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<{
        attachmentsCount: number | undefined;
        questionsHash: string | undefined;
        answersHash: string | undefined;
    }>();
    const [brand, setBrand] = useState<string>();
    const resetAll = useCallback(() => {
        setAttachments({
            attachmentsCount: undefined,
            questionsHash: undefined,
            answersHash: undefined
        });
        setBrand(undefined);
        setLoading(false);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 200);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    useEffect(() => {
        if (debouncedTerm) {
            setLoading(true);

            const fetcher = new BlockchainProductDataFetcher(props.nodeUrl, debouncedTerm);

            Promise.all([
                fetcher.getProductBrand(),
                fetcher.getProductAttachments()
            ]).then(([_brand, _attachments]) => {
                setBrand(_brand);
                setAttachments(_attachments);
                setLoading(false);
            })
                .catch(e => {
                    console.error(e);
                    resetAll();
                });
        }
    }, [debouncedTerm]);

    return <Container>
        <Content>
            <CenteredDiv>
                <Title>
                    Product Details
                </Title>
                <Subtitle>
                    Enter Product ID to see its details
                </Subtitle>
                <InlineSearchContent>
                    <InlineSearchInnterContent>
                        <SearchIconContainer>
                            <SearchIcon/>
                        </SearchIconContainer>
                        <SearchBoxContainer>
                            <form onSubmit={ e => e.preventDefault() }>
                                <SearchBox type="text"
                                           autoComplete="off"
                                           autoCorrect="off"
                                           spellCheck={ false }
                                           value={ searchTerm }
                                           onChange={ e => setSearchTerm(e.target.value) }
                                           placeholder="Product ID..."/>
                            </form>
                        </SearchBoxContainer>
                    </InlineSearchInnterContent>
                </InlineSearchContent>

                { loading ? <div>
                    Loading...
                </div> : (
                    debouncedTerm ? (
                        attachments?.attachmentsCount ? <div>
                            <ValuesFlex>
                                <Label>Product</Label>
                                <ValueBox>
                                    <Hash useEllipsis={false}>
                                        { debouncedTerm }
                                    </Hash>
                                </ValueBox>
                            </ValuesFlex>

                            <ValuesFlex>
                                <Label>Brand</Label>
                                <ValueBox>
                                    <Hash useEllipsis={false}>
                                        { brand || "" }
                                    </Hash>
                                </ValueBox>
                            </ValuesFlex>

                            <ValuesFlex>
                                <LabelNoHeight>Compliance Questions Hash</LabelNoHeight>
                                <ValueBox>
                                    <Hash useEllipsis={false}>
                                        { attachments.questionsHash || "" }
                                    </Hash>
                                </ValueBox>
                            </ValuesFlex>

                            <ValuesFlex>
                                <LabelNoHeight>Compliance Answers Hash</LabelNoHeight>
                                <ValueBox>
                                    <Hash useEllipsis={false}>
                                        { attachments.answersHash || "" }
                                    </Hash>
                                </ValueBox>
                            </ValuesFlex>
                        </div> : <div>
                            Not Found
                        </div>
                    ) : null
                ) }
            </CenteredDiv>
        </Content>;
    </Container>;
}
